import { and, eq, isNotNull } from "drizzle-orm";
import { getDb } from "../../../db";
import { leads } from "../../../db/schema";
import { getApiUser } from "../../admin-auth";

export async function POST(request:Request){
 const user=await getApiUser(); if(!user)return Response.json({error:"Faça login para usar o match.",signIn:"/signin-with-chatgpt?return_to=/area-testes"},{status:401});
 const [viewer]=await getDb().select({id:leads.id}).from(leads).where(and(eq(leads.authUserId,user.userId),eq(leads.status,"approved"))); if(!viewer)return Response.json({error:"Cadastro não aprovado."},{status:403});
 const body=await request.json() as {category?:string;state?:string;service?:string;mode?:string};
 const rows=await getDb().select().from(leads).where(and(eq(leads.role,"supplier"),eq(leads.status,"approved"),isNotNull(leads.phoneVerifiedAt)));
 const results=rows.map(item=>{const states:string[]=JSON.parse(item.serviceStates||"[]"),services:string[]=JSON.parse(item.services||"[]"),categories:string[]=(()=>{try{const value=JSON.parse(item.categories||"[]");return Array.isArray(value)&&value.length?value:[item.category]}catch{return[item.category]}})();const reasons:string[]=[];let score=0;if(body.category&&categories.includes(body.category)){score+=45;reasons.push("atua na categoria escolhida")}if(body.state&&(item.servesNationwide||states.includes(body.state))){score+=25;reasons.push(item.servesNationwide?"atendimento nacional":"atende seu estado")}if(body.service&&services.includes(body.service)){score+=20;reasons.push(`oferece ${body.service.toLowerCase()}`)}if(body.mode&&(item.serviceMode===body.mode||item.serviceMode==="both")){score+=10;reasons.push("modalidade compatível")}if(item.verificationStatus==="verified"){score+=10;reasons.push("fornecedor verificado")}return{id:item.id,name:item.company||item.name,category:item.category,city:item.city,state:item.state,score,reasons}}).filter(item=>item.score>0).sort((a,b)=>b.score-a.score).slice(0,8);
 return Response.json({results,explanation:"As recomendações usam categoria, região, serviço, modalidade e verificação. Não há influência de pagamento."});
}
