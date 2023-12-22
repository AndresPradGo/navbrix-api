import express from 'express';

const router = express.Router()

// POST: Weather briefing
router.post('/weather', async (req, res) => {
    console.log('Weather biefings reached')
    return res.status(200).json({briefing: "Weather"})
})

// POST: NOTAM briefing
router.post('/notam', async (req, res) => {
    console.log('NOTAM biefings reached')
    return res.status(200).json({briefing: "notam"})
})

export default router