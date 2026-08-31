const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  conn.exec('curl -s http://127.0.0.1:8011/routes | grep -B 2 -A 5 "assignments"', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => {
      conn.exec('docker logs --tail 30 sannalms-assessment-service', (err2, stream2) => {
        stream2.on('close', () => {
          conn.exec('docker logs --tail 30 sannalms-assignment-service', (err3, stream3) => {
            stream3.on('close', () => conn.end())
              .on('data', d => console.log('[ASSIGNMENT SERVICE LOG]', d.toString()))
              .stderr.on('data', d => console.error('[ASSIGNMENT SERVICE ERR]', d.toString()));
          });
        }).on('data', d => console.log('[ASSESSMENT SERVICE LOG]', d.toString()))
          .stderr.on('data', d => console.error('[ASSESSMENT SERVICE ERR]', d.toString()));
      });
    }).on('data', (d) => console.log('[KONG ROUTE]', d.toString()))
      .stderr.on('data', (d) => console.error(d.toString()));
  });
}).connect({
  host: '195.35.21.204',
  port: 22,
  username: 'root',
  password: 'FCx.xfQ9grQg7WdB'
});
