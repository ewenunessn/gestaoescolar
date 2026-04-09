// Script para decodificar o token JWT e verificar seu conteúdo
// Execute: node decode-token.js

// Cole o token completo aqui (o que aparece nos logs do console)
const token = "COLE_O_TOKEN_AQUI";

if (token === "COLE_O_TOKEN_AQUI") {
  console.log("❌ Por favor, cole o token JWT completo no script");
  console.log("   Você pode encontrá-lo nos logs do console do navegador");
  console.log("   Procure por: [API DEBUG] Token adicionado ao header Authorization");
  process.exit(1);
}

try {
  // Decodificar o header
  const [headerB64, payloadB64, signature] = token.split('.');
  
  if (!headerB64 || !payloadB64 || !signature) {
    console.log("❌ Token inválido - formato incorreto");
    process.exit(1);
  }
  
  const header = JSON.parse(Buffer.from(headerB64, 'base64').toString());
  const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
  
  console.log("\n📋 INFORMAÇÕES DO TOKEN JWT\n");
  console.log("=" .repeat(60));
  
  console.log("\n🔐 HEADER:");
  console.log(JSON.stringify(header, null, 2));
  
  console.log("\n📦 PAYLOAD:");
  console.log(JSON.stringify(payload, null, 2));
  
  console.log("\n⏰ VALIDADE:");
  if (payload.iat) {
    const issuedAt = new Date(payload.iat * 1000);
    console.log(`   Emitido em: ${issuedAt.toLocaleString('pt-BR')}`);
  }
  
  if (payload.exp) {
    const expiresAt = new Date(payload.exp * 1000);
    const now = new Date();
    const isExpired = now > expiresAt;
    const timeLeft = expiresAt - now;
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
    const daysLeft = Math.floor(hoursLeft / 24);
    
    console.log(`   Expira em: ${expiresAt.toLocaleString('pt-BR')}`);
    console.log(`   Status: ${isExpired ? '❌ EXPIRADO' : '✅ VÁLIDO'}`);
    
    if (!isExpired) {
      if (daysLeft > 0) {
        console.log(`   Tempo restante: ${daysLeft} dias e ${hoursLeft % 24} horas`);
      } else {
        console.log(`   Tempo restante: ${hoursLeft} horas`);
      }
    }
  }
  
  console.log("\n👤 DADOS DO USUÁRIO:");
  console.log(`   ID: ${payload.id || 'N/A'}`);
  console.log(`   Email: ${payload.email || 'N/A'}`);
  console.log(`   Nome: ${payload.nome || 'N/A'}`);
  console.log(`   Tipo: ${payload.tipo || 'N/A'}`);
  console.log(`   Escola ID: ${payload.escola_id || 'N/A'}`);
  console.log(`   System Admin: ${payload.isSystemAdmin || false}`);
  
  console.log("\n🔑 ASSINATURA:");
  console.log(`   ${signature.substring(0, 50)}...`);
  
  console.log("\n" + "=".repeat(60));
  
  console.log("\n💡 PRÓXIMOS PASSOS:");
  console.log("   1. Verifique se o token está expirado");
  console.log("   2. Verifique se o JWT_SECRET está configurado no Vercel");
  console.log("   3. Compare este token com um gerado no localhost");
  
} catch (error) {
  console.error("❌ Erro ao decodificar token:", error.message);
  console.log("\n💡 Certifique-se de que você colou o token JWT completo");
}
