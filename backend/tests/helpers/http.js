const { once } = require('node:events');

async function withServer(app, run) {
    const server = app.listen(0);
    await once(server, 'listening');

    try {
        const { port } = server.address();
        return await run(`http://127.0.0.1:${port}`);
    } finally {
        await new Promise((resolve, reject) => {
            server.close((err) => {
                if (err) {
                    reject(err);
                    return;
                }

                resolve();
            });
        });
    }
}

async function requestJson(baseUrl, pathname, options = {}) {
    const headers = {
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(options.headers || {})
    };

    const response = await fetch(`${baseUrl}${pathname}`, {
        ...options,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    const text = await response.text();

    return {
        status: response.status,
        body: text ? JSON.parse(text) : null
    };
}

module.exports = {
    requestJson,
    withServer
};
