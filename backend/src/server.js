require('dotenv').config({ quiet: true });

const app = require('./app');

const PORT = process.env.PORT || 5001;

function startServer(port = PORT) {
    return app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
}

if (require.main === module) {
    startServer();
}

module.exports = {
    startServer
};
