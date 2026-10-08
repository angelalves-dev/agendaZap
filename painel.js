// =====================================================
// AGENDAZAP — PAINEL ADMINISTRATIVO
// Arquivo: painel.js
// =====================================================

(() => {
    "use strict";

    // -------------------------------------------------
    // 1. CONFIGURAÇÃO SUPABASE
    // Mantenha aqui os mesmos valores do seu projeto.
    // Use somente a chave publicável/anon no navegador.
    // Nunca coloque a service_role ou uma chave secreta.
    // -------------------------------------------------

    const SUPABASE_URL = "https://xebtgiabbansfuutpzuf.supabase.co";
    const SUPABASE_KEY = "sb_publishable_Kvl6OcLGFthJKBkkruVIfw_ILvT6g-j";
    const NEGOCIO_ID = "60b419c8-3981-44b0-a319-d1542b3b210a";

    let supabaseClient;
    let agendamentos = [];
    let filtroStatus = "todos";
    let carregando = false;

    // -------------------------------------------------
    // 2. FUNÇÕES AUXILIARES
    // -------------------------------------------------

    function encontrarElemento(seletores) {
        for (const seletor of seletores) {
            const elemento = document.querySelector(seletor);
            if (elemento) return elemento;
        }

        return null;
    }

    function escaparHTML(valor) {
        return String(valor ?? "").replace(/[&<>"']/g, caractere => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[caractere]);
    }

    function formatarMoeda(valor) {
        return Number(valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function formatarData(data) {
        if (!data) return "Não informada";

        const partes = String(data).split("-");

        if (partes.length !== 3) {
            return escaparHTML(data);
        }

        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    function normalizarStatus(status) {
        return String(status || "pendente")
            .trim()
            .toLowerCase();
    }

    function nomeStatus(status) {
        const nomes = {
            pendente: "Pendente",
            confirmado: "Confirmado",
            cancelado: "Cancelado",
            concluido: "Concluído",
            concluído: "Concluído"
        };

        return nomes[normalizarStatus(status)] ||
            escaparHTML(status || "Pendente");
    }

    function mostrarMensagem(mensagem, tipo = "info") {
        const lista = obterLista();

        lista.innerHTML = `
            <div class="mensagem-painel mensagem-${escaparHTML(tipo)}">
                ${escaparHTML(mensagem)}
            </div>
        `;
    }

    function obterLista() {
        let lista = encontrarElemento([
            "#listaAgendamentos",
            "#lista-agendamentos",
            "#agendamentos",
            "#listaPedidos",
            "#lista-pedidos",
            "#lista"
        ]);

        // Evita quebrar o script caso o HTML não tenha a lista.
        if (!lista) {
            lista = document.createElement("div");
            lista.id = "listaAgendamentos";
            lista.className = "lista-agendamentos";
            document.body.appendChild(lista);
            console.warn(
                "AgendaZap: lista não encontrada no HTML; foi criada uma área de exibição."
            );
        }

        return lista;
    }

    // -------------------------------------------------
    // 3. AUTENTICAÇÃO E INICIALIZAÇÃO
    // -------------------------------------------------

    async function iniciarPainel() {
        if (!window.supabase || !window.supabase.createClient) {
            mostrarMensagem(
                "A biblioteca do Supabase não carregou. Verifique a conexão e a tag script no HTML.",
                "erro"
            );
            return;
        }

        if (
            !SUPABASE_URL.startsWith("https://") ||
            SUPABASE_KEY === "COLE_AQUI_SUA_CHAVE_PUBLICAVEL" ||
            SUPABASE_URL === "COLE_AQUI_SUA_URL"
        ) {
            mostrarMensagem(
                "Configure a URL e a chave publicável do Supabase no início de painel.js.",
                "erro"
            );
            return;
        }

        try {
            supabaseClient = window.supabase.createClient(
                SUPABASE_URL,
                SUPABASE_KEY
            );

            const { data, error } =
                await supabaseClient.auth.getSession();

            if (error) throw error;

            if (!data.session) {
                window.location.href = "login.html";
                return;
            }

            // Observa expiração ou encerramento da sessão.
            supabaseClient.auth.onAuthStateChange((evento, sessao) => {
                if (evento === "SIGNED_OUT" || !sessao) {
                    window.location.href = "login.html";
                }
            });

            configurarFiltros();
            await carregarAgendamentos();

        } catch (erro) {
            console.error("Erro ao iniciar o AgendaZap:", erro);

            mostrarMensagem(
                "Não foi possível iniciar o painel. Confira o login e a configuração do Supabase.",
                "erro"
            );
        }
    }

    // -------------------------------------------------
    // 4. CARREGAR AGENDAMENTOS
    // -------------------------------------------------

    async function carregarAgendamentos() {
        if (!supabaseClient || carregando) return;

        carregando = true;
        obterLista().innerHTML = `
            <div class="mensagem-painel">
                Carregando agendamentos...
            </div>
        `;

        try {
            const { data, error } = await supabaseClient
    .from("agendamentos")
    .select(
        "id, created_at, servico, preco, data, horario, nome, whatsapp, status, negocio_id"
    )
    .eq("negocio_id", NEGOCIO_ID)
    .order("data", { ascending: true })
    .order("horario", { ascending: true });

            if (error) throw error;

            agendamentos = Array.isArray(data) ? data : [];

            atualizarEstatisticas();
            renderizarAgendamentos();

        } catch (erro) {
            console.error("Erro ao carregar agendamentos:", erro);

            mostrarMensagem(
                "Não foi possível carregar os agendamentos. Confira as permissões SELECT da tabela agendamentos no Supabase.",
                "erro"
            );

        } finally {
            carregando = false;
        }
    }

    // -------------------------------------------------
    // 5. ESTATÍSTICAS
    // Atualiza somente os contadores que existirem no HTML.
    // -------------------------------------------------

    function atualizarEstatisticas() {
        const total = agendamentos.length;

        const confirmados = agendamentos.filter(
            item => normalizarStatus(item.status) === "confirmado"
        ).length;

        const pendentes = agendamentos.filter(
            item => normalizarStatus(item.status) === "pendente"
        ).length;

        const cancelados = agendamentos.filter(
            item => normalizarStatus(item.status) === "cancelado"
        ).length;

        const faturamento = agendamentos
            .filter(item => normalizarStatus(item.status) === "confirmado")
            .reduce((soma, item) => soma + Number(item.preco || 0), 0);

        definirTexto(
            ["#totalAgendamentos", "#totalAgendados", "#totalPedidos"],
            total
        );

        definirTexto(
            ["#totalConfirmados", "#totalConfirmado"],
            confirmados
        );

        definirTexto(
            ["#totalPendentes", "#totalPendente"],
            pendentes
        );

        definirTexto(
            ["#totalCancelados", "#totalCancelado"],
            cancelados
        );

        definirTexto(
            ["#faturamento", "#faturamentoTotal"],
            formatarMoeda(faturamento)
        );
    }

    function definirTexto(seletores, texto) {
        const elemento = encontrarElemento(seletores);
        if (elemento) elemento.textContent = String(texto);
    }

    // -------------------------------------------------
    // 6. FILTROS DE STATUS
    // -------------------------------------------------

    function configurarFiltros() {
        document.querySelectorAll("[data-filtro]").forEach(botao => {
            if (botao.dataset.agendazapListener === "sim") return;

            botao.dataset.agendazapListener = "sim";

            botao.addEventListener("click", () => {
                filtroStatus = normalizarFiltro(
                    botao.dataset.filtro
                );

                document.querySelectorAll("[data-filtro]").forEach(item => {
                    item.classList.toggle("ativo", item === botao);
                });

                renderizarAgendamentos();
            });
        });

        const botaoAtualizar = encontrarElemento([
            "#btnAtualizar",
            "#atualizarAgendamentos",
            "#btn-atualizar"
        ]);

        if (
            botaoAtualizar &&
            botaoAtualizar.dataset.agendazapListener !== "sim"
        ) {
            botaoAtualizar.dataset.agendazapListener = "sim";
            botaoAtualizar.addEventListener(
                "click",
                carregarAgendamentos
            );
        }
    }

    function normalizarFiltro(valor) {
        const texto = String(valor || "todos")
            .trim()
            .toLowerCase();

        if (texto === "todos") return "todos";
        if (texto === "pendente" || texto === "pendentes") return "pendente";
        if (
            texto === "confirmado" ||
            texto === "confirmados" ||
            texto === "agendado" ||
            texto === "agendados"
        ) return "confirmado";

        if (texto === "cancelado" || texto === "cancelados") {
            return "cancelado";
        }

        return texto;
    }

    // -------------------------------------------------
    // 7. EXIBIR OS AGENDAMENTOS
    // -------------------------------------------------

    function renderizarAgendamentos() {
        const lista = obterLista();

        const dataFiltro = encontrarElemento([
            "#filtroData",
            "#dataFiltro",
            "#filtrarData",
            "#data"
        ]);

        const dataEscolhida = dataFiltro?.value || "";

        const filtrados = agendamentos.filter(item => {
            const status = normalizarStatus(item.status);

            const correspondeStatus =
                filtroStatus === "todos" ||
                status === filtroStatus;

            const correspondeData =
                !dataEscolhida || item.data === dataEscolhida;

            return correspondeStatus && correspondeData;
        });

        if (!filtrados.length) {
            lista.innerHTML = `
                <div class="mensagem-painel">
                    Nenhum agendamento encontrado para este filtro.
                </div>
            `;
            return;
        }

        lista.innerHTML = filtrados.map(item => {
            const status = normalizarStatus(item.status);
            const telefone = normalizarTelefone(item.whatsapp);

            const linkWhatsApp = telefone
                ? `https://wa.me/${telefone}?text=${encodeURIComponent(
                    `Olá, ${item.nome || ""}! Estou entrando em contato sobre seu agendamento de ${item.servico || "serviço"} para ${formatarData(item.data)} às ${item.horario || ""}.`
                )}`
                : "";

            return `
                <article class="card-agendamento">
                    <div class="cabecalho-agendamento">
                        <h3>${escaparHTML(item.nome || "Cliente sem nome")}</h3>
                        <span class="status-agendamento status-${escaparHTML(status)}">
                            ${nomeStatus(status)}
                        </span>
                    </div>

                    <div class="detalhes-agendamento">
                        <p><strong>Serviço:</strong> ${escaparHTML(item.servico || "Não informado")}</p>
                        <p><strong>Preço:</strong> ${formatarMoeda(item.preco)}</p>
                        <p><strong>Data:</strong> ${formatarData(item.data)}</p>
                        <p><strong>Horário:</strong> ${escaparHTML(item.horario || "Não informado")}</p>
                        <p><strong>WhatsApp:</strong> ${escaparHTML(item.whatsapp || "Não informado")}</p>
                        <p><strong>Código:</strong> ${escaparHTML(item.id)}</p>
                    </div>

                    <div class="acoes-agendamento">
                        ${
                            status === "pendente"
                                ? `<button type="button" class="btn-acao btn-confirmar" data-acao="confirmar" data-id="${escaparHTML(item.id)}">Confirmar</button>`
                                : ""
                        }

                        ${
                            status !== "cancelado" && status !== "concluido" && status !== "concluído"
                                ? `<button type="button" class="btn-acao btn-cancelar" data-acao="cancelar" data-id="${escaparHTML(item.id)}">Cancelar</button>`
                                : ""
                        }

                        ${
                            linkWhatsApp
                                ? `<a class="btn-acao btn-whatsapp" href="${linkWhatsApp}" target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a>`
                                : ""
                        }
                    </div>
                </article>
            `;
        }).join("");

        configurarAcoesAgendamento(lista);
    }

    function normalizarTelefone(valor) {
        let telefone = String(valor || "").replace(/\D/g, "");

        if (!telefone) return "";

        // Acrescenta o código do Brasil a números locais.
        if (telefone.length === 10 || telefone.length === 11) {
            telefone = "55" + telefone;
        }

        // Evita gerar links inválidos.
        if (telefone.length < 12 || telefone.length > 13) {
            return "";
        }

        return telefone;
    }

    // -------------------------------------------------
    // 8. CONFIRMAR OU CANCELAR
    // -------------------------------------------------

    function configurarAcoesAgendamento(lista) {
        lista.querySelectorAll("[data-acao][data-id]").forEach(botao => {
            if (botao.dataset.agendazapListener === "sim") return;

            botao.dataset.agendazapListener = "sim";

            botao.addEventListener("click", async () => {
                const id = botao.dataset.id;
                const acao = botao.dataset.acao;

                if (!id || !["confirmar", "cancelar"].includes(acao)) {
                    return;
                }

                const novoStatus =
                    acao === "confirmar" ? "confirmado" : "cancelado";

                const pergunta = acao === "confirmar"
                    ? "Deseja confirmar este agendamento?"
                    : "Deseja cancelar este agendamento?";

                if (!window.confirm(pergunta)) return;

                botao.disabled = true;
                const textoOriginal = botao.textContent;
                botao.textContent = "Salvando...";

                try {
                    const { data, error } = await supabaseClient
                        .from("agendamentos")
                        .update({ status: novoStatus })
                        .eq("id", id)
                        .select("id, status");

                    if (error) throw error;

                    if (!data || data.length === 0) {
                        throw new Error(
                            "Nenhum registro foi atualizado. Verifique as permissões UPDATE no Supabase."
                        );
                    }

                    await carregarAgendamentos();

                } catch (erro) {
                    console.error("Erro ao atualizar agendamento:", erro);

                    window.alert(
                        "Não foi possível atualizar o status. Confira as permissões UPDATE e a política RLS da tabela."
                    );

                    botao.disabled = false;
                    botao.textContent = textoOriginal;
                }
            });
        });
    }

    // -------------------------------------------------
    // 9. FILTRAR POR DATA
    // -------------------------------------------------

    function configurarFiltroData() {
        const campo = encontrarElemento([
            "#filtroData",
            "#dataFiltro",
            "#filtrarData",
            "#data"
        ]);

        if (!campo || campo.dataset.agendazapListener === "sim") {
            return;
        }

        campo.dataset.agendazapListener = "sim";
        campo.addEventListener("change", renderizarAgendamentos);
    }

    // -------------------------------------------------
    // 10. SAIR DA CONTA
    // -------------------------------------------------

    async function sair() {
        if (!supabaseClient) {
            window.location.href = "login.html";
            return;
        }

        const { error } = await supabaseClient.auth.signOut();

        if (error) {
            console.error("Erro ao sair:", error);
            window.alert("Não foi possível encerrar a sessão. Tente novamente.");
            return;
        }

        window.location.href = "login.html";
    }

    // Funções disponíveis para botões do HTML, se necessário.
    window.carregarAgendamentos = carregarAgendamentos;
    window.mostrarTodos = () => {
        filtroStatus = "todos";

        const campoData = encontrarElemento([
            "#filtroData",
            "#dataFiltro",
            "#filtrarData",
            "#data"
        ]);

        if (campoData) campoData.value = "";

        renderizarAgendamentos();
    };
    window.sair = sair;

    // -------------------------------------------------
    // 11. INICIAR
    // -------------------------------------------------

    document.addEventListener("DOMContentLoaded", () => {
        configurarFiltroData();
        iniciarPainel();
    });
})();
