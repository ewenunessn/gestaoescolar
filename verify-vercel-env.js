// Script para verificar se as variáveis de ambiente estão configuradas corretamente no Vercel
// Este script deve ser executado LOCALMENTE para gerar comandos de verificação

console.log("\n🔍 VERIFICAÇÃO DE VARIÁVEIS DE AMBIENTE NO VERCEL\n");
console.log("=" .repeat(70));

console.log("\n📋 VARIÁVEIS NECESSÁRIAS NO BACKEND:\n");

const requiredEnvVars = [
  {
    name: "JWT_SECRET",
    description: "Secret para assinar tokens JWT",
    critical: true,
    example: "your_super_secret_jwt_key_change_this_in_production_2024",
    currentLocal: process.env.JWT_SECRET || "NÃO CONFIGURADO"
  },
  {
    name: "DATABASE_URL",
    description: "URL de conexão com PostgreSQL (Neon)",
    critical: true,
    example: "postgresql://user:pass@host/db?sslmode=require",
    currentLocal: process.env.DATABASE_URL ? "CONFIGURADO" : "NÃO CONFIGURADO"
  },
  {
    name: "JWT_EXPIRES_IN",
    description: "Tempo de expiração do token",
    critical: false,
    example: "7d",
    currentLocal: process.env.JWT_EXPIRES_IN || "7d (padrão)"
  },
  {
    name: "NODE_ENV",
    description: "Ambiente de execução",
    critical: true,
    example: "production",
    currentLocal: process.env.NODE_ENV || "development"
  },
  {
    name: "CORS_ORIGIN",
    description: "Origens permitidas para CORS",
    critical: false,
    example: "https://nutriescola.vercel.app",
    currentLocal: process.env.CORS_ORIGIN || "NÃO CONFIGURADO"
  }
];

requiredEnvVars.forEach((envVar, index) => {
  const icon = envVar.critical ? "🔴" : "🟡";
  console.log(`${icon} ${index + 1}. ${envVar.name}`);
  console.log(`   Descrição: ${envVar.description}`);
  console.log(`   Crítico: ${envVar.critical ? "SIM" : "Não"}`);
  console.log(`   Exemplo: ${envVar.example}`);
  console.log(`   Local (.env): ${envVar.currentLocal}`);
  console.log();
});

console.log("=" .repeat(70));

console.log("\n📝 COMO CONFIGURAR NO VERCEL:\n");
console.log("1. Acesse: https://vercel.com/dashboard");
console.log("2. Selecione o projeto: gestaoescolar-backend");
console.log("3. Vá em: Settings → Environment Variables");
console.log("4. Adicione cada variável acima");
console.log("5. Selecione os ambientes: Production, Preview, Development");
console.log("6. Clique em 'Save'");
console.log("7. Faça um novo deploy ou force redeploy");

console.log("\n🔧 COMANDO PARA GERAR JWT_SECRET SEGURO:\n");
console.log("node -e \"console.log(require('crypto').randomBytes(64).toString('hex'))\"");

console.log("\n⚠️  IMPORTANTE:\n");
console.log("- O JWT_SECRET deve ser o MESMO em todos os ambientes");
console.log("- NUNCA commite o JWT_SECRET no código");
console.log("- Use um valor FIXO (não dinâmico como Date.now())");
console.log("- Após configurar, faça um redeploy completo");

console.log("\n✅ VERIFICAÇÃO PÓS-CONFIGURAÇÃO:\n");
console.log("1. Faça login no sistema");
console.log("2. Copie o token do console (F12)");
console.log("3. Execute: node decode-token.js");
console.log("4. Verifique se o token não está expirado");
console.log("5. Recarregue a página - deve permanecer logado");

console.log("\n" + "=" .repeat(70) + "\n");

// Verificar se estamos em ambiente Vercel
if (process.env.VERCEL === '1') {
  console.log("🌐 EXECUTANDO NO VERCEL\n");
  console.log("Variáveis de ambiente detectadas:");
  console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '✅ CONFIGURADO' : '❌ NÃO CONFIGURADO'}`);
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ CONFIGURADO' : '❌ NÃO CONFIGURADO'}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'não definido'}`);
  console.log(`   VERCEL_ENV: ${process.env.VERCEL_ENV || 'não definido'}`);
  
  if (!process.env.JWT_SECRET) {
    console.log("\n❌ PROBLEMA CRÍTICO: JWT_SECRET não está configurado!");
    console.log("   Isso causará tokens inválidos a cada restart do servidor.");
  }
} else {
  console.log("💻 EXECUTANDO LOCALMENTE\n");
  console.log("Para verificar as variáveis no Vercel, você precisa:");
  console.log("1. Acessar o dashboard do Vercel");
  console.log("2. Ou adicionar este script como uma rota de debug no backend");
}
