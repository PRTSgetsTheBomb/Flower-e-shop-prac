/**
 * AI分析服务
 * 封装LLM调用、上下文构建、响应缓存
 * 支持 OpenAI 兼容 API（DeepSeek / GPT）和 Anthropic Claude
 */

const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

// ===== 客户端初始化 -----
const BASE_URL = process.env.AI_BASE_URL || 'https://api.openai.com/v1';
const MODEL = process.env.AI_MODEL || 'claude-sonnet-5';
const IS_ANTHROPIC = BASE_URL.includes('anthropic');

// 初始化对应客户端
let openaiClient = null;
let anthropicClient = null;

if (IS_ANTHROPIC) {
    anthropicClient = new Anthropic({ apiKey: process.env.AI_API_KEY });
    console.log('[AI] Provider: Anthropic, model:', MODEL);
} else {
    openaiClient = new OpenAI({ apiKey: process.env.AI_API_KEY, baseURL: BASE_URL });
    console.log('[AI] Provider: OpenAI-compatible, baseURL:', BASE_URL, 'model:', MODEL);
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
    const { overview, topProducts, topAreas, monthlyTrend, dateRange } = data;

    let ctx = '';

    // 日期范围
    if (dateRange) {
        ctx += `Data time range: ${dateRange}\n\n`;
    }

    // 月度趋势（紧跟日期，让AI最先看到时间维度）
    if (monthlyTrend && monthlyTrend.length > 0) {
        ctx += `[Monthly Breakdown — orders & revenue by month]\n${monthlyTrend}\n\n`;
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

    return ctx;
}

// ----- 系统Prompt -----
const SYSTEM_PROMPT = `You are a data analyst at a flower shop named "Pisces Flower".
Your task is to answer questions about the store's sales data.

Guidelines:
- Answer the user's specific question directly and concisely. Do NOT output all sections unless the question is broad (e.g. "analyze everything" / "give me a full report").
- Use Markdown formatting for readability (headings, lists, bold).
- Only mention data that actually exists in the provided context. Do not fabricate.
- If the data is insufficient to answer the question, say so honestly.
- All amounts are in Australian dollars (AUD).`;

// ----- 核心API -----
/**
 * 调用 LLM 分析销售数据
 * @param {object} data - { overview, topProducts, topAreas, monthlyTrend, dateRange }
 * @param {string} [question] - 可选的特定问题
 * @returns {Promise<string>} AI 分析文本（Markdown）
 */

async function analyzeSales(data, question) {
    const context = buildContext(data);
    const userMessage = question
        ? `Here is the sales data:\n\n${context}\n\nQuestion: ${question}\n\nAnswer concisely based on the data above.`
        : `Here is the sales data:\n\n${context}\n\nGive a concise analysis covering key insights, top products, delivery areas, and recommendations. Use Markdown headings.`;

    // 生成缓存key
    const dataHash = Buffer.from(context).toString('base64').slice(0, 40);
    const cacheKey = getCacheKey(dataHash, question || '__full__');
    const cached = getCached(cacheKey);
    if (cached) {
        console.log('cache hit!');
        return cached;
    }

    try {
        let result;

        if (IS_ANTHROPIC) {
            const response = await anthropicClient.messages.create({
                model: MODEL,
                system: SYSTEM_PROMPT,
                messages: [{ role: 'user', content: userMessage }],
                max_tokens: 5000,
            });
            result = response.content[0]?.text || 'AI assistant failed to generate the result.';
            console.log(`[AI] Analysis complete, tokens: input=${response.usage?.input_tokens} output=${response.usage?.output_tokens}`);
        } else {
            const response = await openaiClient.chat.completions.create({
                model: MODEL,
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

        // 写入缓存
        setCached(cacheKey, result);
        return result;
    }
    catch (err) {
        console.error('[AI] LLM call failed:', err.message);
        throw new Error(`AI 分析服务暂时不可用：${err.message}`);
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
async function streamAnalysis(data, question, onChunk) {
    const context = buildContext(data);
    const userMessage = question
        ? `Here is the sales data:\n\n${context}\n\nQuestion: ${question}\n\nAnswer concisely based on the data above.`
        : `Here is the sales data:\n\n${context}\n\nGive a concise analysis covering key insights, top products, delivery areas, and recommendations. Use Markdown headings.`;

    if (IS_ANTHROPIC) {
        const stream = await anthropicClient.messages.stream({
            model: MODEL,
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
        const stream = await openaiClient.chat.completions.create({
            model: MODEL,
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