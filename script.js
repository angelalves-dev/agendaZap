
const SUPABASE_URL = "https://xebtgiabbansfuutpzuf.supabase.co";
const SUPABASE_KEY = "sb_publishable_Kvl6OcLGFthJKBkkruVIfw_ILvT6g-j";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// Identifica a barbearia pela URL.
// Se não houver parâmetro, mantém a Agenda Angel como padrão.
const parametros = new URLSearchParams(window.location.search);
const slugNegocio = parametros.get("negocio") || "agenda-angel";

let negocioAtual = null;
let servicosDisponiveis = [];
let servicoAtual = null;

document.addEventListener("DOMContentLoaded", async function () {
    const campoData = document.getElementById("data");

    if (campoData) {
        const hoje = new Date();
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, "0");
        const dia = String(hoje.getDate()).padStart(2, "0");

        campoData.min = `${ano}-${mes}-${dia}`;
    }

    await carregarNegocioEServicos();
});

function formatarPreco(preco) {
    return Number(preco).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

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
            alert("Barbearia não encontrada. Confira o link.");
            desativarServicos();
            return;
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

        atualizarCartoesDeServicos();

        if (servicosDisponiveis.length === 0) {
            alert(
                "Esta barbearia ainda não cadastrou serviços. " +
                "Entre em contato com o responsável."
            );
        }
    } catch (erro) {
        console.error("Erro ao carregar a barbearia:", erro);
        alert(
            "Não foi possível carregar os serviços. " +
            "Confira sua conexão e as permissões do Supabase."
        );
    }
}

function desativarServicos() {
    document.querySelectorAll(".servico").forEach(botao => {
        botao.hidden = true;
    });
}

function atualizarCartoesDeServicos() {
    const botoes = document.querySelectorAll(".servico");

    botoes.forEach(botao => {
        // Lê o nome que já está definido no onclick do HTML.
        const onclick = botao.getAttribute("onclick") || "";
        const resultado = onclick.match(
            /selecionarServico\(\s*['"]([^'"]+)['"]/
        );

        if (!resultado) {
            botao.hidden = true;
            return;
        }

        const nomeHtml = resultado[1];

        const servico = servicosDisponiveis.find(
            item => item.nome === nomeHtml
        );

        if (!servico) {
            botao.hidden = true;
            return;
        }

        botao.hidden = false;

        const descricao = botao.querySelector("p");
        const precoElemento = botao.querySelector("strong");

        if (descricao && servico.descricao) {
            descricao.textContent = servico.descricao;
        }

        if (precoElemento) {
            precoElemento.textContent =
                `R$ ${formatarPreco(servico.preco)}`;
        }

        // Remove o evento antigo do HTML
        // e conecta o serviço encontrado no Supabase.
        botao.removeAttribute("onclick");

        botao.onclick = function () {
            selecionarServico(servico.nome);
        };
    });
}

function abrirAgendamento() {
    const area = document.getElementById("agendamento");

    if (area) {
        area.classList.remove("escondido");
        area.scrollIntoView({ behavior: "smooth" });
    }
}

function selecionarServico(nome) {
    const servico = servicosDisponiveis.find(
        item => item.nome === nome
    );

    if (!servico) {
        alert("Este serviço não está disponível.");
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

async function confirmarAgendamento() {
    const campoData = document.getElementById("data");
    const campoHorario = document.getElementById("horario");
    const campoNome = document.getElementById("nome");
    const campoWhatsapp = document.getElementById("whatsapp");

    if (!negocioAtual) {
        alert("Aguarde o carregamento da barbearia.");
        return;
    }

    if (!servicoAtual) {
        alert("Escolha um serviço primeiro.");
        return;
    }

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

    if (botaoConfirmar) botaoConfirmar.disabled = true;

    try {
        const { data: resultado, error } = await supabaseClient.rpc(
            "criar_agendamento_publico",
            {
                p_slug: slugNegocio,
                p_servico_id: servicoAtual.id,
                p_data: data,
                p_horario: horario,
                p_nome: nome,
                p_whatsapp: whatsapp
            }
        );

        if (error) throw error;

        console.log("Agendamento criado:", resultado);

        alert("Agendamento realizado com sucesso!");

        const area = document.getElementById("agendamento");
        if (area) area.classList.add("escondido");

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
        if (botaoConfirmar) botaoConfirmar.disabled = false;
    }
}

function limparFormulario() {
    ["data", "horario", "nome", "whatsapp"].forEach(id => {
        const campo = document.getElementById(id);
        if (campo) campo.value = "";
    });
}

function voltarInicio() {
    const sucesso = document.getElementById("sucesso");
    if (sucesso) sucesso.classList.add("escondido");

    const inicio = document.querySelector("header");
    if (inicio) {
        inicio.scrollIntoView({ behavior: "smooth" });
    }
}

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
