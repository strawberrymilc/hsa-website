// index.js
console.log("Hello from Node.js!");

const http = require('http');
const server = http.createServer((req, res) => {
  res.end('Hello World!');
});
server.listen(3000, () => console.log('Server running on port 3000'));