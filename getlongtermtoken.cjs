const axios = require('axios');

const appId = '1739631596969313';
const appSecret = 'c2ecc0afdc4944d6af68575524ed6545';
const shortLivedToken = 'EAAYuL4tgnWEBO5gLx7cDZAXP9qtMlqtoctePPLr7lSLQCQt5M4g9xmOIMyY0km1UHX9TuFFlxk1rvQNlQiE0ie6WbO9n3W4APBIVaUJhDZAvHumWNj5UM4qYRon5AIHVyjPqLCXUWkBxsVIxFSd8RJVB0IaHIM106cMVDAjEWKISrjFkQm1w33eTMU3BuUaA1I4ZAv0VC1YQcUZD';

async function getLongLivedToken() {
  try {
    const response = await axios.get('https://graph.facebook.com/v12.0/oauth/access_token', {
      params: {
        grant_type: 'fb_exchange_token',
        client_id: appId,
        client_secret: appSecret,
        fb_exchange_token: shortLivedToken,
      },
    });

    console.log('Long-lived token:', response.data.access_token);
  } catch (error) {
    console.error('Error generating long-lived token:', error.response?.data || error.message);
  }
}

getLongLivedToken();