/**
 * AI分析服务
 * 封装LLM调用、上下文构建、响应缓存
 * 支持 OpenAI 兼容 API（DeepSeek / GPT）和 Anthropic Claude
 */

const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

const clients = {};

// Claude
if (process.env.CLAUDE_API_KEY && process.env.CLAUDE_BASE_URL?.includes('anthropic')) {
    clients.anthropic = new Anthropic({
        apiKey: process.env.CLAUDE_API_KEY,
    });
    console.log('[AI] Provider: Anthropic, model using:', process.env.CLAUDE_MODEL);
}

// DeepSeek（OpenAI 兼容）
if (process.env.DEEPSEEK_API_KEY) {
    clients.deepseek = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseURL: 'https://api.deepseek.com/v1',
    });
    console.log('[AI] Provider: DeepSeek, models: Flash=', process.env.DEEPSEEK_FLASH_MODEL, 'Pro=', process.env.DEEPSEEK_PRO_MODEL);
}

// 默认模型
const DEFAULT_MODEL = process.env.DEEPSEEK_FLASH_MODEL || 'deepseek-v4-flash';

/**
 * 根据模型名判断提供商和实际模型名
 * 支持 "auto" 自动选择模式
 */
function resolveProvider(model, question, data) {
    if (!model || model === 'auto') {
        return null;
    }
    // 手动指定了具体模型 -> 直接解析
    const m = model.toLowerCase();
    if (m.startsWith('deepseek-')) return { provider: 'deepseek', model: m };
    if (m.startsWith('claude-')) return { provider: 'anthropic', model: m };
    return { provider: 'deepseek', model: m };
}

/**
 * 自动选择模型：用轻量 LLM 对用户问题分类，再路由到合适的模型
 * @param {string} question - 用户问题
 * @param {object} data - 分析数据（用于判断上下文大小）
 * @returns {{ provider: string, model: string }}
 */
async function autoSelectModel(question, data) {
    const q = (question || '').trim();

    // 无问题 -> 默认Pro
    if (!q) return { provider: 'deepseek', model: process.env.DEEPSEEK_PRO_MODEL };

    const qLower = q.toLowerCase();

    // SIMPLE — 纯事实查询：数量、金额、排名、列出、某天的订单
    const simplePatterns = [
        /\b(how many|how much|what is|list|show|count|total)\b/,
        /\b(when|who|which|where)\b/,
        /\b(top|best|most|least|favorite)\b/,
        /\b(status|phone|address|email|contact)\b/,
        /\b(today|yesterday|this week|this month)\b/,
        /\b(sold|orders?|sales?)\s+(in|on|of|from|for|at)\b/,
        /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/,
    ];
    const isSimple = simplePatterns.some(p => p.test(qLower)) && q.length < 120;

    // COMPLEX — 深度推理
    const complexPatterns = [
        /\b(why|reason|cause)\b/,
        /\b(recommend|suggest|advice|strategy|improve)\b/,
        /\b(predict|forecast|expect|will|going to)\b/,
        /\b(what if|scenario|if we)\b/,
    ];
    const isComplex = complexPatterns.some(p => p.test(qLower));

    if (isComplex) {
        console.log('[AI] Auto-select: COMPLEX -> Pro');
        return { provider: 'deepseek', model: process.env.DEEPSEEK_PRO_MODEL };
    }
    if (isSimple) {
        console.log('[AI] Auto-select: SIMPLE -> Flash');
        return { provider: 'deepseek', model: process.env.DEEPSEEK_FLASH_MODEL };
    }
    // 其余（MODERATE：趋势、对比、分析） -> Claude
    console.log('[AI] Auto-select: MODERATE -> Claude');
    return { provider: 'anthropic', model: process.env.CLAUDE_MODEL || 'claude-sonnet-5' };
}

// ----- 简易内存缓存 -----
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000;

function getCacheKey(dataHash, question) {
    return `${dataHash}::${question}`;
}

function getCached(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.time > CACHE_TTL) {
        cache.delete(key);
        return null;
    }
    return entry.value;
}

function setCached(key, value) {
    if (cache.size > 100) {
        const oldest = cache.keys().next().value;
        cache.delete(oldest);
    }
    cache.set(key, { value, time: Date.now() });
}

// ---------- 上下文构建 ----------
/**
 * 从 analytics 数据中提取关键摘要，控制 token 用量
 * @param {object} data - 包含 summary、products、areas 的分析数据
 * @returns {string} 结构化文本摘要
 */
function buildContext(data) {
    const { overview, topProducts, topAreas, monthlyTrend, todaySummary, dateRange, historyOrders, refunds } = data;

    let ctx = '';

    // 日期范围
    if (dateRange) {
        ctx += `Data time range: ${dateRange}\n\n`;
    }

    // 月度趋势（紧跟日期，让AI最先看到时间维度）
    if (monthlyTrend && monthlyTrend.length > 0) {
        ctx += `[Monthly Breakdown — orders & revenue by month]\n${monthlyTrend}\n\n`;
    }

    // 今日待处理订单
    if (todaySummary && todaySummary.length > 0) {
        ctx += `[Today's Pending Orders]\n${todaySummary}\n\n`;
    }

    // 总览API
    if (overview) {
        ctx += `[Overview]
- Total Orders: ${overview.totalOrders}
- Total Revenue (Delivery Fee Excluded): $${overview.totalRevenue?.toFixed(2)}
- Average Order Value: $${overview.avgOrderValue?.toFixed(2)}
- Delivery Count: ${overview.deliveryCount} (${overview.deliveryRatio}%)
- Pickup Count: ${overview.pickupCount} (${overview.pickupRatio}%)
- Total Delivery Fee: $${overview.totalDeliveryFee?.toFixed(2) || '0.00'}
`;
        if (overview.statusCounts) {
            ctx += `- Order Status Distribution: ${JSON.stringify(overview.statusCounts)}\n`;
        }
        ctx += '\n';
    }

    // 热销商品 Top5
    if (topProducts && topProducts.length > 0) {
        ctx += `[Products Top ${topProducts.length}]\n`;
        topProducts.forEach((p, i) => {
            ctx += `${i + 1}. ${p.name} - selled ${p.totalQty}, revenue $${p.totalRevenue?.toFixed(2)}, Delibery Ratio ${p.deliveryRatio}%\n`;
        });
        ctx += '\n';
    }

    // 热门地区 Top5
    if (topAreas && topAreas.length > 0) {
        ctx += `[Areas Top ${topAreas.length}] \n`;
        topAreas.forEach((a, i) => {
            ctx += `${i + 1}. ${a.suburb} - ${a.orderCount} orders, revenue $${a.totalRevenue?.toFixed(2)}\n`;
        });
        ctx += '\n';
    }

    // 完整历史订单（摘要格式，控制 token）
    if (historyOrders && historyOrders.length > 0) {
        const totalHistory = historyOrders.length;
        const completedOrders = historyOrders.filter(o => o.status === 'completed').length;
        const cancelledOrders = historyOrders.filter(o => o.status === 'cancelled').length;
        const deliveryOrders = historyOrders.filter(o => o.delivery === 'Delivery').length;
        const pickupOrders = historyOrders.filter(o => o.delivery === 'Pickup').length;

        // 回头客统计
        const customerCounts = {};
        historyOrders.forEach(o => {
            if (o.customer && o.customer !== 'Unknown') {
                customerCounts[o.customer] = (customerCounts[o.customer] || 0) + 1;
            }
        });
        const repeatCustomers = Object.entries(customerCounts)
            .filter(([, count]) => count > 1)
            .sort(([, a], [, b]) => b - a);

        ctx += `[Full Order History — ${totalHistory} total orders]\n`;
        ctx += `- Completed: ${completedOrders}, Cancelled: ${cancelledOrders}\n`;
        ctx += `- Delivery: ${deliveryOrders}, Pickup: ${pickupOrders}\n`;

        if (repeatCustomers.length > 0) {
            ctx += `- Top repeat customers: `;
            ctx += repeatCustomers.slice(0, 5).map(([name, count]) => `${name} (${count} orders)`).join(', ');
            ctx += '\n';
        }
        ctx += '\n';
    }

    // 退款数据
    if (refunds && refunds.length > 0) {
        const pending = refunds.filter(r => r.status === 'pending');
        const approved = refunds.filter(r => r.status === 'approved');
        const rejected = refunds.filter(r => r.status === 'rejected');
        const reasons = {};
        refunds.forEach(r => { reasons[r.reason] = (reasons[r.reason] || 0) + 1; });
        ctx += `[Refund Requests — ${refunds.length} total]\n`;
        ctx += `- Pending: ${pending.length}, Approved: ${approved.length}, Rejected: ${rejected.length}\n`;
        ctx += `- Reasons: ${Object.entries(reasons).map(([k,v]) => `${k}(${v})`).join(', ')}\n`;
        if (approved.length > 0) {
            const totalRefunded = approved.reduce((s, r) => s + (r.refundAmount || 0), 0);
            ctx += `- Total Refunded: $${totalRefunded.toFixed(2)}\n`;
        }
        ctx += '\n';
    }

    return ctx;
}

// ----- 系统Prompt -----
const SYSTEM_PROMPT = `You are a data analyst at a flower shop named "Pisces Flower".
Your task is to answer questions about the store's sales data.

Guidelines:
- Answer the user's specific question directly and concisely. Do NOT output all sections unless the question is broad (e.g. "analyze everything" / "give me a full report").
- Use Markdown formatting for readability (headings, lists, bold).
- Only mention data that actually exists in the provided context. Do not fabricate.
- If the data is insufficient to answer the question, say so honestly.- For questions about totals, rankings, or "most/best/which", refer to the aggregated summary data (Overview, Products Top, Areas Top) rather than counting individual orders. The summary data is pre-computed and authoritative.- All amounts are in Australian dollars (AUD).
- When answering questions about totals or rankings, aggregate across ALL orders in the Full Order History, not just the recent ones.
- If the user asks about refunds, return rates, or refund reasons, refer to the [Refund Requests] section. This section shows pending/approved/rejected counts, refund reasons distribution, and total refunded amount.`;

// ----- 核心API -----
/**
 * 调用 LLM 分析销售数据
 * @param {object} data - { overview, topProducts, topAreas, monthlyTrend, dateRange }
 * @param {string} [question] - 可选的特定问题
 * @returns {Promise<string>} AI 分析文本（Markdown）
 */

async function analyzeSales(data, question, model) {
    const { provider, model: actualModel } = resolveProvider(model);
    console.log(`[AI] >>> Request — model: ${actualModel}, provider: ${provider}, question: "${(question || '').slice(0, 60)}"`);

    const context = buildContext(data);
    const userMessage = question
        ? `Here is the sales data:\n\n${context}\n\nQuestion: ${question}\n\nAnswer concisely based on the data above.`
        : `Here is the sales data:\n\n${context}\n\nGive a concise analysis covering key insights, top products, delivery areas, and recommendations. Use Markdown headings.`;

    const dataHash = Buffer.from(context).toString('base64').slice(0, 40);
    const cacheKey = getCacheKey(dataHash, question || '__full__');
    const cached = getCached(cacheKey);
    if (cached) {
        console.log('cache hit!');
        return cached;
    }

    const client = clients[provider];
    if (!client) throw new Error(`AI provider "${provider}" not configured.`);

    try {
        let result;

        if (provider === 'anthropic') {
            const response = await client.messages.create({
                model: actualModel,
                system: SYSTEM_PROMPT,
                messages: [{ role: 'user', content: userMessage }],
                max_tokens: 5000,
            });
            result = response.content[0]?.text || 'AI assistant failed to generate the result.';
            console.log(`[AI] Analysis complete, tokens: input=${response.usage?.input_tokens} output=${response.usage?.output_tokens}`);
        } else {
            const response = await client.chat.completions.create({
                model: actualModel,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: userMessage },
                ],
                temperature: 0.5,
                max_tokens: 5000,
            });
            result = response.choices[0].message?.content || 'AI assistant failed to generate the result.';
            console.log(`[AI] Analysis complete, tokens used: ${response.usage?.total_tokens}`);
        }

        setCached(cacheKey, result);
        return result;
    }
    catch (err) {
        console.error('[AI] LLM call failed:', err.message);
        throw new Error(`AI Analysis is not available for now: ${err.message}`);
    }
}

function clearCache() {
    const count = cache.size;
    cache.clear();
    console.log(`[AI] Cache cleared (${count} entries removed)`);
    return count;
}

/**
 * 流式调用 LLM 分析销售数据
 * @param {object} data
 * @param {string} [question]
 * @param {function} onChunk - 每收到一段文本时回调
 */
async function streamAnalysis(data, question, model, onChunk) {
    let providerInfo = resolveProvider(model, question, data);
    if (!providerInfo) {
        providerInfo = await autoSelectModel(question, data);
    }
    const { provider, model: actualModel } = providerInfo;
    console.log(`[AI] >>> Request — model: ${actualModel}, provider: ${provider}, question: "${(question || '').slice(0, 60)}"`);

    const context = buildContext(data);
    const userMessage = question
        ? `Here is the sales data:\n\n${context}\n\nQuestion: ${question}\n\nAnswer concisely based on the data above.`
        : `Here is the sales data:\n\n${context}\n\nGive a concise analysis covering key insights, top products, delivery areas, and recommendations. Use Markdown headings.`;

    const client = clients[provider];
    if (!client) throw new Error(`AI provider "${provider}" not configured.`);

    if (provider === 'anthropic') {
        const stream = await client.messages.stream({
            model: actualModel,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userMessage }],
            max_tokens: 5000,
        });
        for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta?.text) {
                onChunk(event.delta.text);
            }
        }
    } else {
        const stream = await client.chat.completions.create({
            model: actualModel,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userMessage },
            ],
            temperature: 0.5,
            max_tokens: 5000,
            stream: true,
        });
        for await (const chunk of stream) {
            const content = chunk.choices?.[0]?.delta?.content;
            if (content) onChunk(content);
        }
    }
}

module.exports = { analyzeSales, clearCache, streamAnalysis };