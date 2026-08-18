# Roadmap de evolução — Hub Brasil

## Objetivo

Transformar o Hub Brasil em uma plataforma gratuita de descoberta e conexão, com benefícios claros para clientes e fornecedores, mantendo moderação, privacidade e qualidade como critérios de destaque.

## Princípios do produto

- O destaque do fornecedor é por qualidade, não por pagamento.
- Nenhum contato do cliente é exposto publicamente.
- O cliente escolhe quando e com quais fornecedores deseja compartilhar seus dados.
- Fornecedores, produtos, eventos e conteúdos passam por aprovação.
- O Hub aproxima as partes, mas não participa de preços, pagamentos ou negociações.
- Métricas devem ser úteis e respeitar a privacidade dos usuários.

## Etapa 0 — Base segura e acesso próprio

**Prioridade: obrigatória antes da abertura pública**

- Substituir a dependência do acesso pelo ChatGPT por autenticação própria.
- Implementar entrada por código ou link enviado por e-mail.
- Manter WhatsApp obrigatório no perfil; validar o telefone do fornecedor pela gestão.
- Separar permissões de cliente, fornecedor e administrador.
- Proteger o administrador com autenticação reforçada e segundo fator.
- Criar consentimentos versionados para Política de Privacidade, Termos e contato de verificação.
- Ativar notificações por e-mail para novos cadastros e itens aguardando aprovação.
- Criar limites contra abuso, registros de auditoria, backup e procedimento de exclusão de dados.

**Resultado esperado:** usuários entram sem conta ChatGPT e cada perfil acessa somente o que lhe pertence.

## Etapa 1 — Ciclo inicial de valor

### 1. Favoritos

- Salvar fornecedores, produtos e eventos.
- Criar a página “Meus favoritos”.
- Permitir remover e organizar itens salvos.
- Exigir login para sincronização entre aparelhos.

### 2. Alertas personalizados

- Usuário escolhe categorias, estados e tipos de alerta.
- Enviar resumo por e-mail, inicialmente semanal.
- Disponibilizar cancelamento simples em cada mensagem e no perfil.
- Alertar somente sobre conteúdo aprovado.

### 3. Selo “Fornecedor verificado”

- Criar estados separados: cadastro em análise, aprovado e verificado.
- Exigir telefone validado e aprovação administrativa para o selo.
- Mostrar a data da última verificação.
- Permitir suspensão ou retirada do selo pelo gestor, com histórico.

### 4. Métricas básicas do fornecedor

- Visualizações do perfil.
- Visualizações dos produtos.
- Cliques no botão de WhatsApp.
- Favoritos recebidos.
- Exibir totais e evolução dos últimos 30 e 90 dias.
- Não revelar identidade individual do visitante apenas por uma visualização.

**Resultado esperado:** clientes têm motivo para criar conta e fornecedores enxergam retorno concreto ao manter o perfil atualizado.

## Etapa 2 — Geração de oportunidades

### Pedido de cotação estruturado

- Formulário com categoria, aplicação, quantidade, cidade/estado, prazo e observações.
- Cliente escolhe explicitamente os fornecedores que receberão a solicitação.
- Mostrar antes do envio quais dados serão compartilhados.
- Gerar número de protocolo e histórico para cliente e fornecedor.
- Notificar fornecedores por e-mail; WhatsApp pode entrar depois.
- Permitir encerrar a demanda e registrar se houve retorno, sem controlar pagamentos.
- Aplicar limite de solicitações e mecanismos contra spam.

### Histórico de contatos

- Registrar cliques de WhatsApp e pedidos de cotação.
- Permitir que o cliente marque “recebi retorno” ou “não recebi retorno”.
- Dar ao usuário opção de apagar o histórico permitido pela política de retenção.

### Avaliações mais confiáveis

- Liberar avaliação somente após contato ou cotação registrada.
- Uma avaliação por cliente, fornecedor e interação elegível.
- Permitir atualização da avaliação, sem criar voto adicional.
- Criar denúncia, moderação e direito de resposta.
- Mostrar média apenas após um número mínimo de avaliações.

**Resultado esperado:** o Hub começa a gerar oportunidades qualificadas e avaliações vinculadas a interações reais.

## Etapa 3 — Qualidade e descoberta

### Completude do perfil

- Calcular percentual por campos preenchidos, produtos aprovados, áreas atendidas e atualização recente.
- Mostrar checklist privado ao fornecedor.
- Não confundir completude com verificação.

### Área de atuação

- Estados atendidos ou atendimento nacional.
- Instalação, suporte, treinamento e pós-venda.
- Modalidade presencial, remota ou ambas.
- Usar essas informações nos filtros e no pedido de cotação.

### Ordenação por qualidade

- Considerar verificação, completude, atualização, avaliações confiáveis e taxa de resposta.
- Não aceitar pagamento para alterar a ordem.
- Publicar uma explicação simples dos critérios.
- Impedir que empresas novas fiquem permanentemente sem visibilidade.

### Comparação de soluções

- Comparar até três produtos.
- Campos padronizados: aplicação, tecnologia, conectividade, garantia e diferenciais.
- Não exibir comparação de preços.
- Permitir solicitar cotação dos itens selecionados.

**Resultado esperado:** busca e comparação mais úteis, com destaque transparente por qualidade.

## Etapa 4 — Comunidade e conteúdo

### “Estou procurando”

- Cliente publica uma necessidade sem telefone visível.
- Gestor aprova a publicação.
- Fornecedores compatíveis manifestam interesse dentro da plataforma.
- O cliente decide com quem compartilhar contato.

### Match por necessidade

- Questionário curto baseado em aplicação, frota, conectividade, localização e suporte.
- Recomendar categorias e fornecedores por critérios objetivos.
- Explicar por que cada resultado foi recomendado.

### Agenda de eventos aprimorada

- Botão “Tenho interesse”.
- Lembretes por e-mail.
- Calendário de eventos favoritos.
- Link externo de inscrição e aviso de que a inscrição ocorre fora do Hub.

### Vitrine de novidades

- Fornecedor publica lançamentos e atualizações técnicas.
- Todas as publicações passam por moderação.
- Definir validade para retirar novidades antigas automaticamente.

### Central de conteúdo técnico

- Guias, glossário e artigos com autor, data e revisão.
- Separar conteúdo editorial de material enviado por fornecedores.
- Revisão especial para conteúdos jurídicos e regulatórios.

### Compartilhamento, QR Code e denúncias

- Link público amigável para cada fornecedor aprovado.
- QR Code para feiras, materiais e redes sociais.
- Botão de denúncia/correção em perfis, produtos, eventos e conteúdos.
- Fila administrativa com motivo, evidência, decisão e histórico.

## Indicadores de sucesso

- Percentual de visitantes que concluem cadastro.
- Percentual de perfis de fornecedores completos e verificados.
- Favoritos e alertas ativados por usuário.
- Cliques no WhatsApp e pedidos de cotação enviados.
- Tempo médio de aprovação, com meta operacional de até 24 horas úteis.
- Taxa de resposta dos fornecedores.
- Avaliações elegíveis versus avaliações moderadas.
- Retenção de clientes e fornecedores em 30 e 90 dias.

## Sequência recomendada

1. Base segura e autenticação própria.
2. Favoritos, alertas, selo e métricas básicas.
3. Cotação estruturada, histórico e avaliações confiáveis.
4. Completude, área de atuação, ordenação e comparação.
5. Mural de demandas, match, eventos, novidades, conteúdo e compartilhamento.

## Critério para abertura pública

- Autenticação própria funcionando.
- Permissões testadas entre os três perfis.
- Administrador protegido e trilha de auditoria ativa.
- Política de Privacidade e Termos revisados.
- Notificações e moderação funcionando.
- Backup, recuperação e canal de suporte definidos.
- Testes completos em celular e computador.
