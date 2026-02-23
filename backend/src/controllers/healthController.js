const axios = require('axios');
const mongoose = require('mongoose');

const healthCheck = async (req, res) => {
  const responseData = {
    ok: true,
    service: 'backend',
    time: new Date().toISOString(),
    db: { ok: false },
    nlp: { ok: false }
  };

  // Check MongoDB connection
  try {
    responseData.db.ok = mongoose.connection.readyState === 1;
  } catch (error) {
    responseData.db.ok = false;
  }

  // Check NLP service
  try {
    const nlpResponse = await axios.get(
      `${process.env.NLP_SERVICE_URL}/health`,
      { timeout: 3000 }
    );
    responseData.nlp.ok = nlpResponse.data?.ok === true;
  } catch (error) {
    responseData.nlp.ok = false;
  }

  // Determine overall status
  if (!responseData.db.ok || !responseData.nlp.ok) {
    responseData.ok = false;
    return res.status(503).json(responseData);
  }

  return res.status(200).json(responseData);
};

module.exports = { healthCheck };
