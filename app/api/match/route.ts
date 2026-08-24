import { and, eq, isNotNull } from "drizzle-orm";
import { getDb } from "../../../db";
import { leads } from "../../../db/schema";
import { getApiUser } from "../../admin-auth";

// Dado antigo/inconsistente no banco não pode derrubar o endpoint inteiro:
// um JSON.parse sem proteção em uma unica linha estourava a rota inteira em 500.
function safeParseArray(value: string | null | undefined): string[] {
  try {
    const parsed: unknown = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export async function POST(request:Request){
 const user=await getApiUser(); if(!user)return Response.json({error:"Faça login para usar o match.",signIn:"/sign-in?return_to=/"},{status:401});
 const [viewer]=await getDb().select({id:leads.id}).from(leads).where(and(eq(leads.authUserId,user.userId),eq(leads.status,"approved"))); if(!viewer)return Response.json({error:"Cadastro não aprovado."},{status:403});
 const body=await request.json() as {category?:string;state?:string;service?:string;mode?:string};
 const rows=await getDb().select().from(leads).where(and(eq(leads.role,"supplier"),eq(leads.status,"approved"),isNotNull(leads.phoneVerifiedAt)));
 const results=rows.map(item=>{const states=safeParseArray(item.serviceStates),services=safeParseArray(item.services);const parsedCategories=safeParseArray(item.categories);const categories:string[]=parsedCategories.length?parsedCategories:[item.category];const reasons:string[]=[];let score=0;if(body.category&&categories.includes(body.category)){score+=45;reasons.push("atua na categoria escolhida")}if(body.state&&(item.servesNationwide||states.includes(body.state))){score+=25;reasons.push(item.servesNationwide?"atendimento nacional":"atende seu estado")}if(body.service&&services.includes(body.service)){score+=20;reasons.push(`oferece ${body.service.toLowerCase()}`)}if(body.mode&&(item.serviceMode===body.mode||item.serviceMode==="both")){score+=10;reasons.push("modalidade compatível")}if(item.verificationStatus==="verified"){score+=10;reasons.push("fornecedor verificado")}return{id:item.id,name:item.company||item.name,category:item.category,city:item.city,state:item.state,score,reasons}}).filter(item=>item.score>0).sort((a,b)=>b.score-a.score).slice(0,8);
 return Response.json({results,explanation:"As recomendações usam categoria, região, serviço, modalidade e verificação. Não há influência de pagamento."});
}
