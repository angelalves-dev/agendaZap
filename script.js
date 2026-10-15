```javascript
// ==========================================
// CONFIGURAÇÃO DO SUPABASE
// ==========================================

const SUPABASE_URL = "https://xebtgiabbansfuutpzuf.supabase.co";
const SUPABASE_KEY = "sb_publishable_Kvl6OcLGFthJKBkkruVIfw_ILvT6g-j";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ==========================================
// BARBEARIA DA URL
// ==========================================

const parametros = new URLSearchParams(window.location.search);
const slugNegocio = parametros.get("negocio") || "agenda-angel";

let negocioAtual = null;
let servicosDisponiveis = [];
let servicoAtual = null;
let carregamentoConcluido = false;

// ==========================================
// INICIALIZAÇÃO
// ==========================================

document.addEventListener("DOMContentLoaded", async function () {
    const campoData = document.getElementById("data");

    if (campoData) {
        const hoje = new Date();
        
campoData.min =
    hoje.getFullYear() + "-" +
    String(hoje.getMonth() + 1).padStart(2, "0") + "-" +
    String(hoje.getDate()).padStart(2, "0");

    }

    // Primeiro, conectar os cartões existentes.
    prepararCartoes();

    // Depois, carregar os serviços reais do banco.
    await carregarNegocioEServicos();
});

// ==========================================
// PREPARAR CARTÕES PARA RECEBER CLIQUES
// ==========================================

function prepararCartoes() {
    document.querySelectorAll(".servico").forEach(botao => {
        // Remover o onclick antigo do HTML.
        botao.removeAttribute("onclick");

        // Não esconder os cartões enquanto carregam.
        botao.hidden = false;
        botao.disabled = true;

        // Impedir que cliques antigos continuem ativos.
        botao.onclick = null;

        // Mostrar uma mensagem de carregamento.
        const titulo = botao.querySelector("h3");

        if (titulo) {
            botao.setAttribute(
                "aria-label",
                `Carregando serviço ${titulo.textContent.trim()}`
            );
        }
    });
}

// ==========================================
// FORMATAR PREÇO
// ==========================================

function formatarPreco(preco) {
    return Number(preco).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// ==========================================
// CARREGAR BARBEARIA E SERVIÇOS
// ==========================================

async function carregarNegocioEServicos() {
    try {
        const { data: negocio, error: erroNegocio } =
            await supabaseClient
                .from("negocios")
                .select("id, nome, slug")
                .eq("slug", slugNegocio)
                .maybeSingle();

        if (erroNegocio) throw erroNegocio;

        if (!negocio) {
            throw new Error(
                "Barbearia não encontrada. Confira o link."
            );
        }

        negocioAtual = negocio;

        const { data: servicos, error: erroServicos } =
            await supabaseClient
                .from("servicos")
                .select("id, nome, descricao, preco")
                .eq("negocio_id", negocio.id)
                .eq("ativo", true);

        if (erroServicos) throw erroServicos;

        servicosDisponiveis = servicos || [];

        // Associar os cartões pelos títulos h3.
        conectarCartoesAosServicos();

        carregamentoConcluido = true;

        console.log("Barbearia carregada:", negocio.nome);
        console.log("Serviços carregados:", servicosDisponiveis);

        if (servicosDisponiveis.length === 0) {
            alert("Esta barbearia ainda não possui serviços cadastrados.");
        }

    } catch (erro) {
        console.error("Erro ao carregar serviços:", erro);

        // Manter os cartões visíveis, mas desativados
        // até que os dados sejam carregados corretamente.
        document.querySelectorAll(".servico").forEach(botao => {
            botao.disabled = true;
        });

        alert(
            "Não foi possível carregar os serviços.\n\n" +
            erro.message
        );
    }
}

// ==========================================
// ASSOCIAR CARTÕES AOS SERVIÇOS
// ==========================================

function conectarCartoesAosServicos() {
    const botoes = document.querySelectorAll(".servico");

    botoes.forEach(botao => {
        const titulo = botao.querySelector("h3");
        const descricao = botao.querySelector("p");
        const precoElemento = botao.querySelector("strong");

        if (!titulo) {
            botao.disabled = true;
            return;
        }

        // Usar o título do cartão, não o onclick antigo.
        const nomeCartao = titulo.textContent.trim();

        const servico = servicosDisponiveis.find(item =>
            item.nome.trim().toLowerCase() ===
            nomeCartao.toLowerCase()
        );

        if (!servico) {
            botao.hidden = true;
            botao.disabled = true;
            return;
        }

        botao.hidden = false;
        botao.disabled = false;

        if (descricao && servico.descricao) {
            descricao.textContent = servico.descricao;
        }

        if (precoElemento) {
            precoElemento.textContent =
                `R$ ${formatarPreco(servico.preco)}`;
        }

        // Substituir completamente o evento antigo.
        botao.onclick = function (evento) {
            evento.preventDefault();
            selecionarServicoPorId(servico.id);
        };

        botao.setAttribute(
            "aria-label",
            `${servico.nome}, R$ ${formatarPreco(servico.preco)}`
        );
    });
}

// ==========================================
// SELECIONAR SERVIÇO PELO ID REAL
// ==========================================

function selecionarServicoPorId(id) {
    if (!carregamentoConcluido) {
        alert("Aguarde os serviços terminarem de carregar.");
        return;
    }

    const servico = servicosDisponiveis.find(
        item => String(item.id) === String(id)
    );

    if (!servico) {
        alert("Serviço não encontrado. Atualize a página.");
        return;
    }

    servicoAtual = servico;

    const campoServico =
        document.getElementById("servicoSelecionado");

    if (campoServico) {
        campoServico.textContent =
            `${servico.nome} - R$ ${formatarPreco(servico.preco)}`;
    }

    abrirAgendamento();
}

// Compatibilidade com chamadas antigas no HTML.
function selecionarServico(nome) {
    const servico = servicosDisponiveis.find(
        item => item.nome === nome
    );

    if (servico) {
        selecionarServicoPorId(servico.id);
    } else {
        alert("Este serviço não está disponível.");
    }
}

// ==========================================
// ABRIR FORMULÁRIO
// ==========================================

function abrirAgendamento() {
    const area = document.getElementById("agendamento");

    if (area) {
        area.classList.remove("escondido");
        area.scrollIntoView({ behavior: "smooth" });
    }
}

// ==========================================
// CONFIRMAR AGENDAMENTO
// ==========================================

async function confirmarAgendamento() {
    if (!carregamentoConcluido || !negocioAtual) {
        alert("Aguarde o carregamento da barbearia.");
        return;
    }

    if (!servicoAtual || !servicoAtual.id) {
        alert("Selecione um serviço antes de continuar.");
        return;
    }

    const campoData = document.getElementById("data");
    const campoHorario = document.getElementById("horario");
    const campoNome = document.getElementById("nome");
    const campoWhatsapp = document.getElementById("whatsapp");

    const data = campoData?.value;
    const horario = campoHorario?.value;
    const nome = campoNome?.value.trim();
    const whatsapp = campoWhatsapp?.value.trim();

    if (!data || !horario || !nome || !whatsapp) {
        alert("Preencha todos os campos do agendamento.");
        return;
    }

    const botaoConfirmar = document.querySelector(
        'button[onclick="confirmarAgendamento()"]'
    );

    if (botaoConfirmar) {
        botaoConfirmar.disabled = true;
    }

    try {
        const { data: resultado, error } =
            await supabaseClient.rpc(
                "criar_agendamento_publico",
                {
                    p_slug: slugNegocio,
                    p_servico_id: servicoAtual.id,
                    p_data: data,
                    p_horario: String(horario),
                    p_nome: nome,
                    p_whatsapp: whatsapp
                }
            );

        if (error) throw error;

        console.log("Agendamento criado:", resultado);

        alert("Agendamento realizado com sucesso!");

        const area = document.getElementById("agendamento");

        if (area) {
            area.classList.add("escondido");
        }

        const sucesso = document.getElementById("sucesso");

        if (sucesso) {
            sucesso.classList.remove("escondido");
            sucesso.scrollIntoView({ behavior: "smooth" });
        }

        limparFormulario();
        servicoAtual = null;

    } catch (erro) {
        console.error("Erro ao criar agendamento:", erro);

        alert(
            "Não foi possível realizar o agendamento.\n\n" +
            (erro.message || "Tente novamente.")
        );

    } finally {
        if (botaoConfirmar) {
            botaoConfirmar.disabled = false;
        }
    }
}

// ==========================================
// LIMPAR FORMULÁRIO
// ==========================================

function limparFormulario() {
    ["data", "horario", "nome", "whatsapp"].forEach(id => {
        const campo = document.getElementById(id);

        if (campo) {
            campo.value = "";
        }
    });
}

// ==========================================
// VOLTAR PARA O INÍCIO
// ==========================================

function voltarInicio() {
    const sucesso = document.getElementById("sucesso");

    if (sucesso) {
        sucesso.classList.add("escondido");
    }

    const inicio = document.querySelector("header");

    if (inicio) {
        inicio.scrollIntoView({ behavior: "smooth" });
    }
}

// ==========================================
// TESTAR CONEXÃO
// ==========================================

async function testarConexao() {
    try {
        const { data, error } = await supabaseClient
            .from("negocios")
            .select("id")
            .eq("slug", slugNegocio)
            .maybeSingle();

        if (error) {
            console.error("Erro na conexão:", error);
            return false;
        }

        return Boolean(data);

    } catch (erro) {
        console.error("Erro inesperado:", erro);
        return false;
    }
}
```
