import React from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpen, 
  Users, 
  BarChart3, 
  Shield, 
  Clock, 
  CheckCircle,
  Mail,
  Phone,
  MapPin,
  ArrowRight
} from 'lucide-react';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <BookOpen className="h-8 w-8 text-blue-600 mr-2" />
              <span className="text-xl font-bold text-gray-900">GestãoEscolar</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                to="/login" 
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Entrar
              </Link>
              <Link 
                to="/registro" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Começar Agora
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Gestão Escolar
              <span className="text-blue-600 block">Simplificada</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Transforme a administração da sua escola com nossa plataforma completa de gestão. 
              Controle estoque, pedidos, cardápios e muito mais em um só lugar.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/registro" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors flex items-center justify-center"
              >
                Começar Gratuitamente
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link 
                to="/login" 
                className="border border-gray-300 hover:border-gray-400 text-gray-700 px-8 py-3 rounded-lg text-lg font-medium transition-colors"
              >
                Fazer Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Recursos Principais
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Tudo que você precisa para gerenciar sua escola de forma eficiente
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Controle de Estoque</h3>
              <p className="text-gray-600">
                Gerencie o estoque de alimentos e materiais com controle de lotes, 
                validades e movimentações em tempo real.
              </p>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Gestão de Escolas</h3>
              <p className="text-gray-600">
                Administre múltiplas escolas, controle de usuários e permissões 
                de forma centralizada e organizada.
              </p>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <BookOpen className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Cardápios e Refeições</h3>
              <p className="text-gray-600">
                Planeje cardápios, gerencie refeições e controle a alimentação 
                escolar de forma prática e eficiente.
              </p>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="bg-orange-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Contratos e Fornecedores</h3>
              <p className="text-gray-600">
                Gerencie contratos, fornecedores e pedidos com controle 
                financeiro e acompanhamento de entregas.
              </p>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="bg-red-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Relatórios em Tempo Real</h3>
              <p className="text-gray-600">
                Acesse dashboards e relatórios detalhados para tomada de 
                decisões baseada em dados atualizados.
              </p>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-xl">
              <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Interface Intuitiva</h3>
              <p className="text-gray-600">
                Design moderno e responsivo que funciona perfeitamente 
                em computadores, tablets e smartphones.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Por que escolher o GestãoEscolar?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Benefícios que fazem a diferença na administração escolar
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="space-y-6">
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Economia de Tempo
                    </h3>
                    <p className="text-gray-600">
                      Automatize processos manuais e reduza o tempo gasto em tarefas administrativas.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Redução de Desperdícios
                    </h3>
                    <p className="text-gray-600">
                      Controle preciso de estoque evita perdas e otimiza o uso de recursos.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Transparência Total
                    </h3>
                    <p className="text-gray-600">
                      Acompanhe todas as movimentações e tenha visibilidade completa dos processos.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <CheckCircle className="h-6 w-6 text-green-500 mt-1 mr-3 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Conformidade Garantida
                    </h3>
                    <p className="text-gray-600">
                      Mantenha-se em conformidade com regulamentações e normas educacionais.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Comece Hoje Mesmo
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600">Configuração</span>
                  <span className="text-green-600 font-semibold">Gratuita</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600">Suporte Técnico</span>
                  <span className="text-green-600 font-semibold">Incluído</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600">Atualizações</span>
                  <span className="text-green-600 font-semibold">Automáticas</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600">Treinamento</span>
                  <span className="text-green-600 font-semibold">Personalizado</span>
                </div>
              </div>
              <Link 
                to="/registro" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors mt-6 block text-center"
              >
                Criar Conta Gratuita
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Entre em Contato
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Tem dúvidas? Nossa equipe está pronta para ajudar você
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Email</h3>
              <p className="text-gray-600">contato@gestaoescolar.com</p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Telefone</h3>
              <p className="text-gray-600">(11) 9999-9999</p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Localização</h3>
              <p className="text-gray-600">São Paulo, SP</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <BookOpen className="h-8 w-8 text-blue-400 mr-2" />
              <span className="text-xl font-bold">GestãoEscolar</span>
            </div>
            <div className="text-gray-400 text-sm">
              © 2024 GestãoEscolar. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;