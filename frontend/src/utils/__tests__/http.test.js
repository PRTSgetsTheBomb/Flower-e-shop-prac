import { safeFetch } from '../http';

beforeEach(() => {
  global.fetch = jest.fn();
});

describe('safeFetch', () => {
  test('成功请求返回 JSON', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ([{ id: 1, name: 'Rose' }]),
    });
    const result = await safeFetch('http://test/api');
    expect(result).toEqual([{ id: 1, name: 'Rose' }]);
  });

  test('非 200 状态码返回空数组', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });
    const result = await safeFetch('http://test/api/404');
    expect(result).toEqual([]);
  });

  test('网络错误返回空数组', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));
    const result = await safeFetch('http://test/api');
    expect(result).toEqual([]);
  });

  test('JSON 解析失败返回空数组', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => { throw new Error('Invalid JSON'); },
    });
    const result = await safeFetch('http://test/api');
    expect(result).toEqual([]);
  });
});
