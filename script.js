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
// IDENTIFICAR A BARBEARIA PELA URL
// ==========================================

const parametros = new URLSearchParams(window.location.search);
const slugNegocio = parametros.get("negocio") || "agenda-angel";

let negocioAtual = null;
let servicosDisponiveis = [];
let servicoAtual = null;

// ==========================================
// INICIALIZAÇÃO
// ==========================================

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

// ==========================================
// FORMATAÇÃO
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
            desativarServicos();
            alert("Barbearia não encontrada. Confira o link.");
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
            alert("Esta barbearia ainda não possui serviços cadastrados.");
        }

    } catch (erro) {
        console.error("Erro ao carregar barbearia:", erro);
        desativarServicos();
        alert("Não foi possível carregar os serviços. Tente novamente.");
    }
}

// ==========================================
// MOSTRAR SERVIÇOS
// ==========================================

function desativarServicos() {
    document.querySelectorAll(".servico").forEach(botao => {
        botao.hidden = true;
    });
}

function atualizarCartoesDeServicos() {
    const botoes = document.querySelectorAll(".servico");

    botoes.forEach(botao => {
        // Guardar o nome original antes de remover o onclick.
        const onclickOriginal = botao.getAttribute("onclick") || "";

        const resultado = onclickOriginal.match(
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

        if (!servico || !servico.id) {
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

        // Remover o evento inline para não enviar argumentos antigos.
        botao.removeAttribute("onclick");

        // Usar diretamente o registro recebido do Supabase.
        botao.onclick = function () {
            selecionarServicoPorId(servico.id);
        };
    });
}

// ==========================================
// SELECIONAR SERVIÇO PELO UUID
// ==========================================

function selecionarServicoPorId(id) {
    const servico = servicosDisponiveis.find(
        item => String(item.id) === String(id)
    );

    if (!servico) {
        alert("Serviço não encontrado. Atualize a página e tente novamente.");
        return;
    }

    // Garantir que o serviço selecionado tenha um UUID.
    const uuidValido =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidValido.test(String(servico.id))) {
        console.error("ID inválido recebido do Supabase:", servico.id);
        alert("O identificador do serviço está inválido. Avise o responsável.");
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

// Compatibilidade com chamadas antigas do HTML.
function selecionarServico(nome) {
    const servico = servicosDisponiveis.find(
        item => item.nome === nome
    );

    if (!servico) {
        alert("Este serviço não está disponível.");
        return;
    }

    selecionarServicoPorId(servico.id);
}

// ==========================================
// ABRIR AGENDAMENTO
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
    const campoData = document.getElementById("data");
    const campoHorario = document.getElementById("horario");
    const campoNome = document.getElementById("nome");
    const campoWhatsapp = document.getElementById("whatsapp");

    if (!negocioAtual) {
        alert("Aguarde o carregamento da barbearia.");
        return;
    }

    if (!servicoAtual || !servicoAtual.id) {
        alert("Escolha um serviço antes de continuar.");
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

    const uuidValido =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidValido.test(String(servicoAtual.id))) {
        console.error("UUID de serviço inválido:", servicoAtual.id);
        alert("O serviço selecionado possui um identificador inválido.");
        return;
    }

    const botaoConfirmar = document.querySelector(
        'button[onclick="confirmarAgendamento()"]'
    );

    if (botaoConfirmar) {
        botaoConfirmar.disabled = true;
    }

    try {
        // Enviar o UUID real do serviço cadastrado no banco.
        const argumentos = {
            p_slug: slugNegocio,
            p_servico_id: String(servicoAtual.id),
            p_data: data,
            p_horario: String(horario),
            p_nome: nome,
            p_whatsapp: whatsapp
        };

        console.log("Enviando agendamento:", {
            ...argumentos,
            p_whatsapp: "[oculto]"
        });

        const { data: resultado, error } = await supabaseClient.rpc(
            "criar_agendamento_publico",
            argumentos
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
