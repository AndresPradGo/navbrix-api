import express from 'express';

const router = express.Router()

router.post('/', async (req, res) => {
    console.log('Weather reports reached')
    return res.status(200).json({report: "Weather"})
})

export default router