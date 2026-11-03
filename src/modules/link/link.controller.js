import {linkService} from './link.service.js'

export const linkController = {
    getLink: async (req, res) => {
        const link = await linkService.getLink (req.params.code);
        res.status(200).json({status: 'success', data: link})
    }
}