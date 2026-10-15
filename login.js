"use strict";

const SUPABASE_URL = "https://xebtgiabbansfuutpzuf.supabase.co";
const SUPABASE_KEY = "sb_publishable_Kvl6OcLGFthJKBkkruVIfw_ILvT6g-j";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const mensagem = document.getElementById("mensagemLogin");
const btnEnviar = document.getElementById("btnEnviar");
const btnAlternar = document.getElementById("btnAlternar");
const subtitulo = document.getElementById("subtitulo");
const textoAlternativo = document.getElementById("textoAlternativo");
const businessNameWrap = document.getElementById("businessNameWrap");
const businessNameInput = document.getElementById("businessName");
let modo = "login";

function mostrarMensagem(texto, tipo = "") {
    mensagem.textContent = texto;
    mensagem.className = "mensagem-login";
    if (tipo) mensagem.classList.add(tipo);
}
function slugBase(texto) {
    return String(texto || "meu-negocio").normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "").toLowerCase()
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 45) || "meu-negocio";
}
async function garantirNegocio(user, nomeInformado = "") {
    const { data: existentes, error: buscaErro } = await supabaseClient
        .from("negocios").select("id,nome,slug").eq("dono_id", user.id).limit(1);
    if (buscaErro) throw new Error("Não consegui verificar seu estabelecimento. Confira as permissões da tabela negocios no Supabase. " + buscaErro.message);
    if (existentes && existentes.length) return existentes[0];

    const nome = String(nomeInformado || user.user_metadata?.business_name || "").trim();
    if (!nome) return null;
    const slug = slugBase(nome) + "-" + String(user.id).replace(/-/g, "").slice(0, 6);
    const { data, error } = await supabaseClient.from("negocios")
        .insert({ dono_id: user.id, nome, slug }).select("id,nome,slug").single();
    if (error) throw new Error("Sua conta foi criada, mas não consegui cadastrar o estabelecimento. Verifique a política de INSERT da tabela negocios no Supabase. " + error.message);
    return data;
}
btnAlternar.addEventListener("click", function () {
    modo = modo === "login" ? "cadastro" : "login";
    mensagem.textContent = "";
    mensagem.className = "mensagem-login";
    businessNameWrap.classList.toggle("hidden", modo !== "cadastro");
    businessNameInput.required = modo === "cadastro";
    if (modo === "cadastro") {
        subtitulo.textContent = "Crie sua conta e cadastre seu negócio";
        btnEnviar.textContent = "Criar conta";
        textoAlternativo.textContent = "Já tem uma conta?";
        btnAlternar.textContent = "Entrar";
        senhaInput.setAttribute("autocomplete", "new-password");
    } else {
        subtitulo.textContent = "Acesso do administrador";
        btnEnviar.textContent = "Entrar";
        textoAlternativo.textContent = "Ainda não tem conta?";
        btnAlternar.textContent = "Criar conta";
        senhaInput.setAttribute("autocomplete", "current-password");
    }
});
loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const email = emailInput.value.trim();
    const senha = senhaInput.value;
    const nomeNegocio = businessNameInput.value.trim();
    if (senha.length < 6) return mostrarMensagem("A senha precisa ter pelo menos 6 caracteres.", "erro-login");
    if (modo === "cadastro" && nomeNegocio.length < 2) return mostrarMensagem("Digite o nome do seu estabelecimento.", "erro-login");
    btnEnviar.disabled = true;
    try {
        if (modo === "cadastro") {
            btnEnviar.textContent = "Criando conta...";
            mostrarMensagem("Criando sua conta...");
            const { data, error } = await supabaseClient.auth.signUp({
                email, password: senha, options: { data: { business_name: nomeNegocio } }
            });
            if (error) throw error;
            if (data.session && data.user) {
                await garantirNegocio(data.user, nomeNegocio);
                mostrarMensagem("Conta e estabelecimento criados! Abrindo seu painel...", "sucesso-login");
                window.location.href = "admin.html";
                return;
            }
            mostrarMensagem("Conta criada! Confirme seu e-mail e depois entre. Se o estabelecimento ainda não aparecer no painel, será necessário conferir as permissões do Supabase.", "sucesso-login");
        } else {
            btnEnviar.textContent = "Entrando...";
            mostrarMensagem("Entrando...");
            const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
            if (error) throw error;
            if (data.user) {
                const negocio = await garantirNegocio(data.user);
                if (!negocio) {
                    mostrarMensagem("Sua conta ainda não tem estabelecimento. Saia e use “Criar conta” com o nome do negócio, ou peça ajuda para vincular seu estabelecimento.", "erro-login");
                    await supabaseClient.auth.signOut();
                    return;
                }
                mostrarMensagem("Login realizado! Abrindo seu painel...", "sucesso-login");
                window.location.href = "admin.html";
            }
        }
    } catch (erro) {
        console.error("Erro no login/cadastro:", erro);
        mostrarMensagem(erro.message || "Ocorreu um erro. Tente novamente.", "erro-login");
    } finally {
        btnEnviar.disabled = false;
        btnEnviar.textContent = modo === "cadastro" ? "Criar conta" : "Entrar";
    }
});
