import React from "react"

import Layout from "../components/Layout"
import SEO from "../components/seo"
// import About from "../components/About"
import { MainContent } from "../styles/base"

const AboutPage = () => (
  <Layout>
    <SEO title="Sobre" description="Uma breve descrição sobre minha pessoa" />
    {/* <About /> */}
    <MainContent>
      <h1>Sobre</h1>
      <p>
        Pós-Graduado em Desenvolvimento de Aplicações para Dispositivos Móveis e
        Cloud Computing pelo Inatel (Instituto Nacional de Telecomunicações).
        Trabalha com várias tecnologias, e atualmente com foco na stack
        JavaScript.
      </p>
      <p>
        Além de um eterno estudante de tecnologia também gosta do mercado
        financeiro, principalmente na area de investimentos. Em breve estarei
        disponibilizando um aplicativo que estou desenvolvendo para o meu TCC
        que é voltado para investidores.
      </p>

      <h2>Habilidades</h2>
      <ul>
        <li>
          Sistema Operacional
          <ul>
            <li>Linux</li>
            <li>macOS</li>
            <li>Windows</li>
          </ul>
        </li>
        <li>
          Desenvolvimento
          <ul>
            <li>Git</li>
            <li>GitHub, GitLab e Bitbucket</li>
            <li>JavaScript TypeScript NodeJS</li>
            <li>React, React Native</li>
            <li>Swift iOS</li>
            <li>Android</li>
            <li>Java e JavaEE</li>
            <li>C#</li>
            <li>PHP</li>
            <li>ASP Classic</li>
          </ul>
        </li>
        <li>
          DevOps
          <ul>
            <li>Docker</li>
            <li>Jenkins</li>
            <li>Kubernetes</li>
            <li>Azure</li>
            <li>AWS</li>
          </ul>
        </li>
        <li>
          Banco de Dados
          <ul>
            <li>SQL - MySQL e POSTGRES</li>
            <li>NoSQL - MongoDB</li>
            <li>SQL Server</li>
          </ul>
        </li>
      </ul>
    </MainContent>
  </Layout>
)

export default AboutPage
