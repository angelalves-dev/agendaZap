
"use strict";

// ==========================================
// SUPABASE
// ==========================================

const SUPABASE_URL = "https://xebtgiabbansfuutpzuf.supabase.co";
const SUPABASE_KEY = "sb_publishable_Kvl6OcLGFthJKBkkruVIfw_ILvT6g-j";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// ==========================================
// BARBEARIA
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

document.addEventListener("DOMContentLoaded", function () {
    definirDataMinima();
    const gradeServicos = document.querySelector(".servicos-grid");
    if (gradeServicos) {
        gradeServicos.addEventListener("click", function (evento) {
            const botao = evento.target.closest(".servico");
            if (!botao) return;
            evento.preventDefault();
            if (!carregamentoConcluido) {
                mostrarErro("Aguarde os serviços carregarem e tente novamente.");
                return;
            }
            selecionarServicoPorId(botao.dataset.servicoId);
        });
    }
    carregarNegocioEServicos();
});

function definirDataMinima() {
    const campo = document.getElementById("data");
    if (!campo) return;

    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");

    campo.min = ano + "-" + mes + "-" + dia;
}

// ==========================================
// UTILITÁRIOS
// ==========================================

function normalizarNome(nome) {
    return String(nome || "").normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ").trim().toLowerCase();
}

function formatarPreco(preco) {
    return Number(preco).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function mostrarErro(mensagem) {
    console.error(mensagem);
    alert(mensagem);
}

// ==========================================
// CARREGAR BARBEARIA E SERVIÇOS
// ==========================================

async function carregarNegocioEServicos() {
    carregamentoConcluido = false;

    try {
        const resultadoNegocio = await supabaseClient
            .from("negocios")
            .select("id, nome, slug")
            .eq("slug", slugNegocio)
            .maybeSingle();

        if (resultadoNegocio.error) {
            throw resultadoNegocio.error;
        }

        if (!resultadoNegocio.data) {
            throw new Error("Barbearia não encontrada. Confira o link.");
        }

        negocioAtual = resultadoNegocio.data;

        const resultadoServicos = await supabaseClient
            .from("servicos")
            .select("id, nome, descricao, preco")
            .eq("negocio_id", negocioAtual.id)
            .eq("ativo", true);

        if (resultadoServicos.error) {
            throw resultadoServicos.error;
        }

        servicosDisponiveis = resultadoServicos.data || [];

        conectarCartoes();

        carregamentoConcluido = true;

        console.log("Barbearia carregada:", negocioAtual.nome);
        console.log("Serviços carregados:", servicosDisponiveis.length);

        if (servicosDisponiveis.length === 0) {
            mostrarErro("Esta barbearia ainda não possui serviços cadastrados.");
        }
    } catch (erro) {
        console.error("Erro ao carregar dados:", erro);
        desativarCartoes();

        mostrarErro(
            "Não foi possível carregar os serviços. " +
            (erro.message || "Verifique a conexão.")
        );
    }
}

// ==========================================
// CONECTAR OS CARTÕES AOS SERVIÇOS
// ==========================================

function desativarCartoes() {
    document.querySelectorAll(".servico").forEach(function (botao) {
        botao.disabled = true;
    });
}

function conectarCartoes() {
    const grade = document.querySelector(".servicos-grid");
    if (!grade) return;

    grade.innerHTML = "";

    servicosDisponiveis.forEach(function (servico) {
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "servico";
        botao.dataset.servicoId = String(servico.id);

        const icone = document.createElement("div");
        icone.className = "icone";
        icone.textContent = "✦";

        const titulo = document.createElement("h3");
        titulo.textContent = servico.nome || "Serviço";

        const descricao = document.createElement("p");
        descricao.textContent = servico.descricao || "Agende este serviço";

        const preco = document.createElement("strong");
        preco.textContent = "R$ " + formatarPreco(servico.preco);

        botao.append(icone, titulo, descricao, preco);
        grade.appendChild(botao);
    });
}

function selecionarServicoPorId(id) {
    if (!carregamentoConcluido) {
        mostrarErro("Aguarde os serviços carregarem.");
        return;
    }

    const servico = servicosDisponiveis.find(function (item) {
        return String(item.id) === String(id);
    });

    if (!servico) {
        mostrarErro("Serviço não encontrado. Atualize a página.");
        return;
    }

    servicoAtual = servico;

    const campo = document.getElementById("servicoSelecionado");

    if (campo) {
        campo.textContent =
            servico.nome + " - R$ " + formatarPreco(servico.preco);
    }

    abrirAgendamento();
}

// Compatibilidade com os botões antigos do HTML.
function selecionarServico(nome) {
    const servico = servicosDisponiveis.find(function (item) {
        return normalizarNome(item.nome) === normalizarNome(nome);
    });

    if (!servico) {
        mostrarErro("Este serviço não está disponível.");
        return;
    }

    selecionarServicoPorId(servico.id);
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
        mostrarErro("Aguarde o carregamento da barbearia.");
        return;
    }

    if (!servicoAtual || !servicoAtual.id) {
        mostrarErro("Escolha um serviço primeiro.");
        return;
    }

    const campoData = document.getElementById("data");
    const campoHorario = document.getElementById("horario");
    const campoNome = document.getElementById("nome");
    const campoWhatsapp = document.getElementById("whatsapp");

    const data = campoData ? campoData.value : "";
    const horario = campoHorario ? campoHorario.value : "";
    const nome = campoNome ? campoNome.value.trim() : "";
    const whatsapp = campoWhatsapp ? campoWhatsapp.value.trim() : "";

    if (!data || !horario || !nome || !whatsapp) {
        mostrarErro("Preencha todos os campos do agendamento.");
        return;
    }

    const botaoConfirmar = document.querySelector(
        'button[onclick="confirmarAgendamento()"]'
    );

    if (botaoConfirmar) {
        botaoConfirmar.disabled = true;
    }

    try {
        const resposta = await supabaseClient.rpc(
            "criar_agendamento_publico",
            {
                p_slug: slugNegocio,
                p_servico_id: String(servicoAtual.id),
                p_data: data,
                p_horario: String(horario),
                p_nome: nome,
                p_whatsapp: whatsapp
            }
        );

        if (resposta.error) {
            throw resposta.error;
        }

        console.log("Agendamento criado:", resposta.data);

        const area = document.getElementById("agendamento");
        if (area) {
            area.classList.add("escondido");
        }

        const sucesso = document.getElementById("sucesso");
        if (sucesso) {
            sucesso.classList.remove("escondido");
            sucesso.scrollIntoView({ behavior: "smooth" });
        }

        alert("Agendamento realizado com sucesso!");

        limparFormulario();
        servicoAtual = null;
    } catch (erro) {
        console.error("Erro ao criar agendamento:", erro);

        mostrarErro(
            "Não foi possível realizar o agendamento: " +
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
    ["data", "horario", "nome", "whatsapp"].forEach(function (id) {
        const campo = document.getElementById(id);

        if (campo) {
            campo.value = "";
        }
    });
}

// ==========================================
// VOLTAR AO INÍCIO
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
        const resposta = await supabaseClient
            .from("negocios")
            .select("id")
            .eq("slug", slugNegocio)
            .maybeSingle();

        if (resposta.error) {
            console.error("Erro de conexão:", resposta.error);
            return false;
        }

        return Boolean(resposta.data);
    } catch (erro) {
        console.error("Erro inesperado:", erro);
        return false;
    }
}
