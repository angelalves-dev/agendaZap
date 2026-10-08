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
// FORMULÁRIO DE LOGIN
// ==========================================

const loginForm =
    document.getElementById("loginForm");


loginForm.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        const email =
            document.getElementById("email")
                .value
                .trim();


        const senha =
            document.getElementById("senha")
                .value;


        const mensagem =
            document.getElementById(
                "mensagemLogin"
            );


        mensagem.textContent =
            "Entrando...";


        mensagem.className =
            "mensagem-login";


        try {

            const {
                data,
                error
            } = await supabaseClient.auth.signInWithPassword({

                email: email,

                password: senha

            });


            if (error) {

                console.error(
                    "Erro no login:",
                    error
                );


                mensagem.textContent =
                    "E-mail ou senha incorretos.";


                mensagem.className =
                    "mensagem-login erro-login";


                return;
            }


            console.log(
                "Login realizado:",
                data.user
            );


            mensagem.textContent =
                "Login realizado! Entrando no painel...";


            mensagem.className =
                "mensagem-login sucesso-login";


            // Ir para o painel

            setTimeout(function () {

                window.location.href =
                    "painel.html";

            }, 500);


        } catch (erro) {

            console.error(
                "Erro inesperado:",
                erro
            );


            mensagem.textContent =
                "Ocorreu um erro. Tente novamente.";


            mensagem.className =
                "mensagem-login erro-login";

        }

    }
);