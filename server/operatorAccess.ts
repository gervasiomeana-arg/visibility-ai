import type{Request,Response,NextFunction}from'express';
import{requireSupabaseAuth}from'./supabaseAuth';
import{isVisibilityOperator,privateAccessMessage}from'../shared/operatorAccess';
export async function requireVisibilityOperator(req:Request,res:Response,next:NextFunction){
 // Health is mounted before this gate. Only anonymous configuration status and
 // state-validated Google callbacks are public; every other API is owner-only.
 if(req.method==='GET'&&(/^\/search-console\/(?:oauth\/callback|callback)\/?$/.test(req.path)||(/^\/search-console\/status\/?$/.test(req.path)&&!req.headers.authorization)))return next();
 return requireSupabaseAuth(req,res,()=>{
  if(!isVisibilityOperator(res.locals.authUser))return res.status(403).json({error:privateAccessMessage});
  next();
 });
}
