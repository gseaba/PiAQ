const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..', '..');

function resolveFromRoot(relativePath) {
    if (path.isAbsolute(relativePath)) {
        return require.resolve(relativePath);
    }

    if (
        relativePath.startsWith('.') ||
        relativePath.includes('/') ||
        relativePath.includes('\\')
    ) {
        return require.resolve(path.join(projectRoot, relativePath));
    }

    return require.resolve(relativePath, { paths: [projectRoot] });
}

function clearModules(relativePaths) {
    for (const relativePath of relativePaths) {
        delete require.cache[resolveFromRoot(relativePath)];
    }
}

function mockModule(relativePath, exports) {
    const resolvedPath = resolveFromRoot(relativePath);
    const previousEntry = require.cache[resolvedPath];

    require.cache[resolvedPath] = {
        id: resolvedPath,
        filename: resolvedPath,
        loaded: true,
        exports
    };

    return () => {
        if (previousEntry) {
            require.cache[resolvedPath] = previousEntry;
            return;
        }

        delete require.cache[resolvedPath];
    };
}

function loadFresh(relativePath, { mocks = {}, clear = [] } = {}) {
    const restores = Object.entries(mocks).map(([mockPath, exports]) =>
        mockModule(mockPath, exports)
    );

    try {
        clearModules([relativePath, ...clear]);
        return require(path.join(projectRoot, relativePath));
    } finally {
        restores.reverse().forEach((restore) => restore());
    }
}

module.exports = {
    clearModules,
    loadFresh,
    projectRoot,
    resolveFromRoot
};
