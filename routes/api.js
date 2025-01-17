const express = require('express');
const router = express.Router();
const historyRouter = require('./api/history/history');

// Mount the history router
router.use('/history', historyRouter);

// Other route mounting...

module.exports = router; 