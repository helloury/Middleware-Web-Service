const express = require('express');
const bodyParser = require('body-parser');
const xml2js = require('xml2js');
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Configuração do Parser para JSON
app.use(bodyParser.json());

// 4. MÓDULO DE SEGURANÇA E CRIPTOGRAFIA (AES-256-CBC)
const ENCRYPTION_KEY = crypto.scryptSync('minha-senha-secreta', 'salt', 32); // Chave de 32 bytes
const IV_LENGTH = 16; // AES requer um vetor de inicialização de 16 bytes

function criptografar(texto) {
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(texto);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    //ConteudoCriptografado (para podermos descriptografar depois)
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function descriptografar(texto) {
    let textParts = texto.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

// =============================================
// 3. SISTEMA LEGADO SIMULADO
// =============================================
/* Este módulo simula o servidor antigo. 
   Ele NÃO aceita JSON, apenas strings XML.
   Ele possui um "banco de dados" em memória.
*/
const dbLegado = []; // Armazena dados criptografados

const sistemaLegado = {
    processarXML: async (xmlString) => {
        const parser = new xml2js.Parser();
        const builder = new xml2js.Builder();

        const result = await parser.parseStringPromise(xmlString);

        //Cadastro
        if (result.cadastro) {
            const novoCliente = {
                id: dbLegado.length + 1,
                // Note que o legado recebe o CPF já criptografado pelo middleware
                nome: result.cadastro.nome[0],
                email: result.cadastro.email[0],
                cpf_secreto: result.cadastro.cpf[0] 
            };
            dbLegado.push(novoCliente);
            
            // Retorna XML de sucesso
            return builder.buildObject({
                resposta: { status: 'sucesso', id: novoCliente.id, mensagem: 'Cliente processado pelo legado.' }
            });
        }

        //Consulta
        if (result.consulta) {
            const idBusca = parseInt(result.consulta.id[0]);
            const cliente = dbLegado.find(c => c.id === idBusca);

            if (cliente) {
                // O legado retorna o dado como está no banco (Criptografado)
                return builder.buildObject({
                    cliente: {
                        id: cliente.id,
                        nome: cliente.nome,
                        email: cliente.email,
                        cpf_protegido: cliente.cpf_secreto // Retorna criptografado
                    }
                });
            } else {
                return builder.buildObject({ erro: { mensagem: 'Cliente nao encontrado' } });
            }
        }
    }
};

// 5. MIDDLEWARE / API GATEWAY
// Middleware de Autenticação
const verificarAuth = (req, res, next) => {
    const token = req.headers['authorization'];
    if (token === 'Bearer 123') {
        next();
    } else {
        res.status(401).json({ erro: 'Não autorizado. Token inválido ou ausente.' });
    }
};

// ENDPOINT 1: POST /api/clientes (Cadastro)
app.post('/api/clientes', verificarAuth, async (req, res) => {
    try {
        const { nome, email, cpf } = req.body;

        //Validação simples
        if (!nome || !cpf) return res.status(400).json({ erro: 'Dados incompletos' });

        //Criptografar dados sensíveis (Requisito 4.2)
        const cpfCriptografado = criptografar(cpf);

        //Converter para XML (Requisito 2)
        const builder = new xml2js.Builder();
        const xmlParaLegado = builder.buildObject({
            cadastro: {
                nome: nome,
                email: email,
                cpf: cpfCriptografado // Envia criptografado
            }
        });

        console.log(`[Middleware] Enviando XML ao Legado:\n${xmlParaLegado}`);

        // Enviar ao Sistema Legado
        const xmlResposta = await sistemaLegado.processarXML(xmlParaLegado);

        // Converter resposta XML do legado para JSON para o cliente
        const parser = new xml2js.Parser({ explicitArray: false }); // simplifica arrays
        const jsonResposta = await parser.parseStringPromise(xmlResposta);

        res.json(jsonResposta);

    } catch (error) {
        res.status(500).json({ erro: 'Erro interno no middleware', detalhe: error.message });
    }
});

// ENDPOINT 2: GET /api/clientes/{id} (Consulta)
app.get('/api/clientes/:id', verificarAuth, async (req, res) => {
    try {
        const id = req.params.id;

        // 1. Gerar XML de requisição
        const builder = new xml2js.Builder();
        const xmlConsulta = builder.buildObject({
            consulta: { id: id }
        });

        // 2. Enviar ao legado
        const xmlResposta = await sistemaLegado.processarXML(xmlConsulta);
        
        // 3. Ler resposta XML
        const parser = new xml2js.Parser({ explicitArray: false });
        const objResposta = await parser.parseStringPromise(xmlResposta);

        if (objResposta.erro) {
            return res.status(404).json(objResposta.erro);
        }

        // 4. Descriptografar dados sensíveis vindos do legado
        // O XML vem como <cpf_protegido>...</cpf_protegido>
        const cpfCifrado = objResposta.cliente.cpf_protegido;
        const cpfOriginal = descriptografar(cpfCifrado);

        // 5. Montar resposta JSON limpa para o cliente
        const respostaCliente = {
            id: objResposta.cliente.id,
            nome: objResposta.cliente.nome,
            email: objResposta.cliente.email,
            cpf: cpfOriginal // Devolvemos o dado legível para o cliente autorizado
        };

        res.json(respostaCliente);

    } catch (error) {
        res.status(500).json({ erro: error.message });
    }
});

// INICIALIZAÇÃO DO SERVIDOR (HTTP)
app.listen(PORT, () => {
    console.log(`Middleware rodando em http://localhost:${PORT}`);
});
