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
  ArrowRight,
  Facebook,
  Twitter,
  Instagram
} from 'lucide-react';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  return (
    <div className="landing-page">
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <Link to="/" className="logo">
            <BookOpen className="logo-icon" size={32} />
            <span>GestãoEscolar</span>
          </Link>
          <div className="nav-links">
            <Link to="/interesse" className="nav-link secondary">
              Interesse
            </Link>
            <Link to="/login" className="nav-link primary">
              Entrar
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <h1 className="hero-title fade-in">
            Gestão Escolar
            <span className="text-gradient"> Simplificada</span>
          </h1>
          <p className="hero-subtitle slide-up">
            Transforme a administração da sua escola com nossa plataforma completa de gestão. 
            Controle estoque, pedidos, cardápios e muito mais em um só lugar.
          </p>
          <div className="hero-buttons slide-up">
            <Link to="/interesse" className="btn btn-primary">
              Demonstrar Interesse
              <ArrowRight size={20} />
            </Link>
            <Link to="/login" className="btn btn-secondary">
              Entrar
            </Link>
          </div>
        </div>
      </section>

      {/* Recursos Principais */}
      <section className="features">
        <div className="features-container">
          <h2 className="section-title">
            Recursos Principais
          </h2>
          <p className="section-subtitle">
            Tudo que você precisa para gerenciar sua escola de forma eficiente
          </p>
          
          <div className="features-grid">
            {/* Controle de Estoque */}
            <div className="feature-card">
              <div className="feature-icon">
                <BarChart3 size={28} />
              </div>
              <h3 className="feature-title">Controle de Estoque</h3>
              <p className="feature-description">
                Gerencie o estoque de alimentos e materiais com controle de lotes, validades e movimentações em tempo real.
              </p>
            </div>
            
            {/* Gestão de Escolas */}
            <div className="feature-card">
              <div className="feature-icon">
                <Users size={28} />
              </div>
              <h3 className="feature-title">Gestão de Escolas</h3>
              <p className="feature-description">
                Administre múltiplas escolas, controle de usuários e permissões de forma centralizada e organizada.
              </p>
            </div>
            
            {/* Cardápios e Refeições */}
            <div className="feature-card">
              <div className="feature-icon">
                <BookOpen size={28} />
              </div>
              <h3 className="feature-title">Cardápios e Refeições</h3>
              <p className="feature-description">
                Planeje cardápios, gerencie refeições e controle a alimentação escolar de forma prática e eficiente.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <Shield size={28} />
              </div>
              <h3 className="feature-title">Contratos e Fornecedores</h3>
              <p className="feature-description">
                Gerencie contratos, fornecedores e pedidos com controle 
                financeiro e acompanhamento de entregas.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <Clock size={28} />
              </div>
              <h3 className="feature-title">Relatórios em Tempo Real</h3>
              <p className="feature-description">
                Acesse dashboards e relatórios detalhados para tomada de 
                decisões baseada em dados atualizados.
              </p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <CheckCircle size={28} />
              </div>
              <h3 className="feature-title">Interface Intuitiva</h3>
              <p className="feature-description">
                Design moderno e responsivo que funciona perfeitamente 
                em computadores, tablets e smartphones.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefícios */}
      <section className="benefits">
        <div className="benefits-container">
          <h2 className="section-title">
            Por que escolher nossa plataforma?
          </h2>
          <p className="section-subtitle">
            Benefícios que fazem a diferença na gestão da sua escola
          </p>
          
          <div className="benefits-grid">
            <div className="benefit-item">
              <CheckCircle className="benefit-icon" size={24} />
              <div>
                <h3 className="benefit-text">Economia de Tempo</h3>
                <p className="feature-description">
                  Automatize processos manuais e reduza o tempo gasto em tarefas administrativas.
                </p>
              </div>
            </div>
                
            <div className="benefit-item">
              <CheckCircle className="benefit-icon" size={24} />
              <div>
                <h3 className="benefit-text">Redução de Desperdícios</h3>
                <p className="feature-description">
                  Controle preciso de estoque evita perdas e otimiza o uso de recursos.
                </p>
              </div>
            </div>
            
            <div className="benefit-item">
              <CheckCircle className="benefit-icon" size={24} />
              <div>
                <h3 className="benefit-text">Transparência Total</h3>
                <p className="feature-description">
                  Acompanhe todas as movimentações e tenha visibilidade completa dos processos.
                </p>
              </div>
            </div>
            
            <div className="benefit-item">
              <CheckCircle className="benefit-icon" size={24} />
              <div>
                <h3 className="benefit-text">Conformidade Garantida</h3>
                <p className="feature-description">
                  Mantenha-se em conformidade com regulamentações e normas educacionais.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contato */}
      <section className="contact">
        <div className="contact-container">
          <h2 className="section-title">
            Entre em Contato
          </h2>
          <p className="section-subtitle">
            Estamos aqui para ajudar você a transformar a gestão da sua escola
          </p>
          
          <div className="contact-grid">
            <div className="contact-item">
              <div className="contact-icon">
                <Mail size={24} />
              </div>
              <h3 className="contact-label">Email</h3>
              <p className="contact-value">contato@gestaoescolar.com</p>
            </div>
            
            <div className="contact-item">
              <div className="contact-icon">
                <Phone size={24} />
              </div>
              <h3 className="contact-label">Telefone</h3>
              <p className="contact-value">(11) 9999-9999</p>
            </div>
            
            <div className="contact-item">
              <div className="contact-icon">
                <MapPin size={24} />
              </div>
              <h3 className="contact-label">Localização</h3>
              <p className="contact-value">São Paulo, SP</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-grid">
            <div className="footer-brand">
              <h3 className="footer-title">Gestão Escolar</h3>
              <p className="footer-description">
                Transforme a administração da sua escola com nossa plataforma completa de gestão.
              </p>
              <div className="footer-social">
                <a href="#" className="social-link">
                  <Facebook size={20} />
                </a>
                <a href="#" className="social-link">
                  <Twitter size={20} />
                </a>
                <a href="#" className="social-link">
                  <Instagram size={20} />
                </a>
              </div>
            </div>
            
            <div className="footer-column">
              <h4 className="footer-column-title">Recursos</h4>
              <ul className="footer-links">
                <li><a href="#" className="footer-link">Gestão de Alunos</a></li>
                <li><a href="#" className="footer-link">Controle Financeiro</a></li>
                <li><a href="#" className="footer-link">Relatórios</a></li>
                <li><a href="#" className="footer-link">Comunicação</a></li>
              </ul>
            </div>
            
            <div className="footer-column">
              <h4 className="footer-column-title">Suporte</h4>
              <ul className="footer-links">
                <li><a href="#" className="footer-link">Central de Ajuda</a></li>
                <li><a href="#" className="footer-link">Documentação</a></li>
                <li><a href="#" className="footer-link">Contato</a></li>
                <li><a href="#" className="footer-link">Status</a></li>
              </ul>
            </div>
          </div>
          
          <div className="footer-bottom">
            <p className="footer-copyright">
              © 2024 Gestão Escolar. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;