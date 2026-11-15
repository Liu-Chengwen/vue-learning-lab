const greetingEndpoint = "/api/v1/demo/hello";

// 使用同源路径，让 Vite 开发代理转发到 Java；生产环境需要部署对应的反向代理。
export async function fetchGreeting(name, { signal } = {}) {
    const params = new URLSearchParams({ name: name.trim() });
    let response;
    try {
        response = await fetch(`${greetingEndpoint}?${params}`, { signal });
    } catch (reason) {
        if (reason?.name === "AbortError") throw reason;
        throw new Error("无法连接接口，请确认前端开发服务和 Spring Boot 已启动后重试。");
    }
    if (!response.ok) {
        throw new Error(`接口请求失败（HTTP ${response.status}），请确认 Spring Boot 已启动后重试。`);
    }
    // 防止代理配置错误时，把开发服务器返回的 HTML 页面误认为接口成功。
    if (!response.headers.get("content-type")?.includes("application/json")) {
        throw new Error("接口未返回 JSON，请检查 /api/v1 的开发代理配置。");
    }
    let result;
    try {
        result = await response.json();
    } catch (reason) {
        if (reason?.name === "AbortError") throw reason;
        throw new Error("接口返回的 JSON 无法解析，请检查后端响应。");
    }
    if (!result || typeof result.message !== "string") {
        throw new Error("接口响应缺少字符串类型的 message 字段。");
    }
    return result;
}
