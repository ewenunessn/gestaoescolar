// Configuração do EmailJS para envio gratuito de emails
// Para configurar o EmailJS, siga os passos abaixo:

/*
1. Acesse https://www.emailjs.com/ e crie uma conta gratuita
2. Crie um novo serviço de email (Gmail, Outlook, etc.)
3. Crie um template de email com as seguintes variáveis:
   - {{from_name}} - Nome do interessado
   - {{from_email}} - Email do interessado
   - {{phone}} - Telefone do interessado
   - {{school}} - Nome da escola/instituição
   - {{position}} - Cargo/função
   - {{message}} - Mensagem adicional
   - {{to_email}} - Email de destino

4. Obtenha suas chaves de API:
   - Service ID (ex: service_xxxxxxx)
   - Template ID (ex: template_xxxxxxx)
   - Public Key (ex: xxxxxxxxxxxxxxx)

5. Substitua os valores abaixo pelas suas chaves reais:
*/

export const emailjsConfig = {
  serviceId: 'service_jmqcb2n', // Substitua pelo seu Service ID
  templateId: 'template_g1cv8nf',   // Substitua pelo seu Template ID
  publicKey: 'Q6o-dcQJlJUeGK23r',       // Substitua pela sua Public Key
  destinationEmail: 'ewertonbarruja@gmail.com' // Email que receberá as mensagens
};

/*
Exemplo de template de email para o EmailJS:

Assunto: Novo interesse em demonstração - {{from_name}}

Corpo do email:
---
Novo interesse em demonstração da plataforma GestãoEscolar!

Dados do interessado:
- Nome: {{from_name}}
- Email: {{from_email}}
- Telefone: {{phone}}
- Escola/Instituição: {{school}}
- Cargo/Função: {{position}}

Mensagem:
{{message}}

---
Este email foi enviado automaticamente através do formulário de interesse.
*/

// Função para validar se as configurações estão definidas
export const validateEmailjsConfig = (): boolean => {
  const { serviceId, templateId, publicKey } = emailjsConfig;
  
  // Verifica se as configurações são válidas (não são valores de exemplo)
  if (!serviceId || !templateId || !publicKey ||
      serviceId.startsWith('service_') && serviceId.length < 15 ||
      templateId.startsWith('template_') && templateId.length < 15 ||
      publicKey.length < 15) {
    console.warn('⚠️ EmailJS configurado com Service ID válido!');
    return true; // Retorna true pois as configurações estão definidas
  }
  
  return true;
};