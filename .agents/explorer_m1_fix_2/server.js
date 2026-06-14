import * as http from 'http';
console.log('Server starting...');
const server = http.createServer((req, res) => {
  res.end('ok');
});
server.listen(3000, () => {
  console.log('Server listening on port 3000');
});
