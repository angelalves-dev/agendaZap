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
// VARIÁVEIS
// ==========================================

let servicoAtual = "";
let precoAtual = 0;


// ==========================================
// QUANDO A PÁGINA CARREGAR
// ==========================================

document.addEventListener("DOMContentLoaded", function () {

    // Coloca a data mínima como hoje
    const campoData = document.getElementById("data");

    if (campoData) {
        const hoje = new Date();

        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, "0");
        const dia = String(hoje.getDate()).padStart(2, "0");

        campoData.min = `${ano}-${mes}-${dia}`;
    }

});


// ==========================================
// ABRIR ÁREA DE AGENDAMENTO
// ==========================================

function abrirAgendamento() {

    const areaAgendamento = document.getElementById("agendamento");

    if (areaAgendamento) {
        areaAgendamento.classList.remove("escondido");

        areaAgendamento.scrollIntoView({
            behavior: "smooth"
        });
    }

}


// ==========================================
// SELECIONAR SERVIÇO
// ==========================================

function selecionarServico(nome, preco) {

    console.log("Serviço selecionado:", nome);
    console.log("Preço:", preco);

    // Salvar serviço escolhido
    servicoAtual = nome;
    precoAtual = preco;

    // Mostrar serviço escolhido na tela
    const servicoSelecionado =
        document.getElementById("servicoSelecionado");

    if (servicoSelecionado) {

        servicoSelecionado.textContent =
            `${nome} - R$ ${Number(preco).toFixed(2).replace(".", ",")}`;

    }

    // Abrir formulário
    abrirAgendamento();

}


// ==========================================
// CONFIRMAR AGENDAMENTO
// ==========================================

async function confirmarAgendamento() {

    // Pegar valores dos campos
    const data = document.getElementById("data").value;
    const horario = document.getElementById("horario").value;
    const nome = document.getElementById("nome").value.trim();
    const whatsapp = document.getElementById("whatsapp").value.trim();


    // ======================================
    // VALIDAÇÕES
    // ======================================

    if (!servicoAtual) {

        alert("Escolha um serviço primeiro.");

        return;
    }


    if (!data) {

        alert("Escolha uma data.");

        return;
    }


    if (!horario) {

        alert("Escolha um horário.");

        return;
    }


    if (!nome) {

        alert("Digite seu nome.");

        return;
    }


    if (!whatsapp) {

        alert("Digite seu WhatsApp.");

        return;
    }


    // ======================================
    // ENVIAR PARA O SUPABASE
    // ======================================

    try {

        console.log("Enviando agendamento...");

        console.log({
            servico: servicoAtual,
            preco: precoAtual,
            data: data,
            horario: horario,
            nome: nome,
            whatsapp: whatsapp
        });


        const { error } = await supabaseClient

            .from("agendamentos")

            .insert({
                negocio_id: "60b419c8-3981-44b0-a319-d1542b3b210a",

                servico: servicoAtual,

                preco: precoAtual,

                data: data,

                horario: horario,

                nome: nome,

                whatsapp: whatsapp,

                status: "pendente"

            });


        // ==================================
        // VERIFICAR ERRO
        // ==================================

        if (error) {

            console.error(
                "Erro ao salvar agendamento:",
                error
            );

            alert(
                "Erro ao salvar agendamento:\n\n" +
                error.message
            );

            return;
        }


        // ==================================
        // SUCESSO
        // ==================================

        console.log("Agendamento salvo com sucesso!");

        alert("Agendamento realizado com sucesso!");


        // Esconder formulário
        const areaAgendamento =
            document.getElementById("agendamento");

        if (areaAgendamento) {

            areaAgendamento.classList.add("escondido");

        }


        // Mostrar mensagem de sucesso
        const areaSucesso =
            document.getElementById("sucesso");

        if (areaSucesso) {

            areaSucesso.classList.remove("escondido");

            areaSucesso.scrollIntoView({
                behavior: "smooth"
            });

        }


        // Limpar formulário
        limparFormulario();

    } catch (erro) {

        console.error(
            "Erro inesperado:",
            erro
        );

        alert(
            "Erro inesperado:\n\n" +
            erro.message
        );

    }

}


// ==========================================
// LIMPAR FORMULÁRIO
// ==========================================

function limparFormulario() {

    const campoData =
        document.getElementById("data");

    const campoHorario =
        document.getElementById("horario");

    const campoNome =
        document.getElementById("nome");

    const campoWhatsapp =
        document.getElementById("whatsapp");


    if (campoData) {
        campoData.value = "";
    }

    if (campoHorario) {
        campoHorario.value = "";
    }

    if (campoNome) {
        campoNome.value = "";
    }

    if (campoWhatsapp) {
        campoWhatsapp.value = "";
    }

}


// ==========================================
// VOLTAR PARA O INÍCIO
// ==========================================

function voltarInicio() {

    const areaSucesso =
        document.getElementById("sucesso");

    if (areaSucesso) {

        areaSucesso.classList.add("escondido");

    }


    const inicio =
        document.querySelector("header");

    if (inicio) {

        inicio.scrollIntoView({
            behavior: "smooth"
        });

    }

}


// ==========================================
// TESTAR CONEXÃO COM SUPABASE
// ==========================================

async function testarConexao() {

    try {

        console.log("Testando conexão com Supabase...");

        const { error } = await supabaseClient

            .from("agendamentos")

            .select("id")

            .limit(1);


        if (error) {

            console.error(
                "Erro na conexão:",
                error
            );

            return false;
        }


        console.log(
            "Conexão com Supabase funcionando!"
        );

        return true;

    } catch (erro) {

        console.error(
            "Erro inesperado na conexão:",
            erro
        );

        return false;
    }

}
