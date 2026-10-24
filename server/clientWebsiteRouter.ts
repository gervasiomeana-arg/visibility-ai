import express from 'express';
import {clientWebsiteUrl} from '../shared/clientWebsite';
const router=express.Router();
// Public promotional entry: only a fixed destination, no arbitrary URL or query forwarding.
router.get(['/', '/:language'],(req,res)=>{
 const language=req.params.language||'es';
 if(!['es','en','pt','fr'].includes(language))return res.status(404).type('text').send('Idioma no disponible.');
 res.setHeader('Cache-Control','no-store');
 return res.redirect(302,clientWebsiteUrl+'/'+language);
});
export default router;
