const fs = require('fs');
fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'testuser', password: 'password123' })
}).then(r => r.json()).then(data => {
  const token = data.token || data.Token;
  console.log('Token:', token ? 'OK' : 'MISSING');
  
  return fetch('http://localhost:5000/api/subjects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      name: 'Test Subject', code: 'TEST', lecturer: 'L', credits: 3, semester: 'S1', colorHex: '#000', isActive: true
    })
  });
}).then(r => {
  console.log('POST Status:', r.status);
  return r.text();
}).then(t => console.log('POST Body:', t)).catch(console.error);
