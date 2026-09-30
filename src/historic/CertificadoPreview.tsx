'use client';
import React from 'react';

export interface CertificadoData {
    escola?: string;
    cnpj?: string;
    endereco?: string;
    cidadeCep?: string;
    website?: string;
    aluno?: string;
    nascimento?: string;
    naturalidade?: string;
    pai?: string;
    mae?: string;
    serie?: string;
    anoLetivo?: string;
    dataLocalString?: string;
    secretariaNome?: string;
    secretariaCargo?: string;
    secretariaReg?: string;
    diretoraNome?: string;
    diretoraCargo?: string;
    diretoraReg?: string;
    dataHoraImpressao?: string;
    sistemaTag?: string;
}

const defaultCertificadoData: CertificadoData = {
    escola: 'COLÉGIO SÃO JUDAS TADEU',
    cnpj: '24.464.554/0001-08',
    endereco: 'Rua Adolfo Gustavo, 435, Serraria.',
    cidadeCep: 'Maceió-AL, CEP 57046-341',
    website: 'www.colegiosjtm.com.br',
    aluno: 'SAMARA LAYS SILVA MOURA',
    nascimento: '16 de Abril de 2009',
    naturalidade: 'Maceió/AL',
    pai: 'ROBERTO BATISTA MOURA',
    mae: 'SANDRA MARIA DA CONCEIÇÃO SILVA',
    serie: '1ª série do Ensino Médio',
    anoLetivo: '2025',
    dataLocalString: 'Maceió-Alagoas, 19 de Junho de 2026.',
    secretariaNome: 'Monica Barros da Silva',
    secretariaCargo: 'Secretária',
    secretariaReg: 'Reg. 187/04 DS/AL',
    diretoraNome: 'Maria Aparecida Lopes',
    diretoraCargo: 'Diretora',
    diretoraReg: 'Nº 353/87 – LP 4205',
    dataHoraImpressao: '09/05/2025, 17:14',
    sistemaTag: 'SIGA',
};

export const CertificadoPreview = ({ data }: { data?: CertificadoData }) => {
    const d = { ...defaultCertificadoData, ...data };

    return (
        <div className="w-full overflow-x-auto p-4 print:p-0 print:overflow-hidden bg-zinc-100 print:bg-white flex justify-center">
            {/* Container A4 Landscape: 1122px x 793px */}
            <div className="w-[1122px] min-w-[1122px] h-[793px] print:w-full print:h-auto bg-white border border-black shadow-lg print:shadow-none flex flex-col p-12 text-black font-sans leading-relaxed relative select-none overflow-hidden justify-between">

                {/* Background Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none select-none z-0">
                    <img src="/stj/assets/logo.png" className="h-full w-auto max-h-16 object-contain" />
                </div>

                {/* Content starts here */}
                <div className="relative z-10 flex flex-col h-full justify-between">

                    {/* 0. LINHA SUPERIOR COM DATA/HORA E TAG DO SISTEMA */}
                    <div className="flex justify-between items-center text-[10px] font-normal text-zinc-500 absolute -top-4 left-0 right-0">
                        <div>{d.dataHoraImpressao}</div>
                        <div>{d.sistemaTag}</div>
                    </div>

                    {/* 1. CABEÇALHO DO COLÉGIO COM LOGO */}
                    <div className="flex items-center justify-between w-full mt-2">
                        {/* Logo do Colégio */}
                        <div className="flex items-center justify-center">
                            <img src="/stj/assets/logo.png" className="h-full w-auto max-h-16 object-contain" />
                        </div>

                        {/* Informações Institucionais */}
                        <div className="flex flex-col items-center text-center">
                            <h1 className="text-[26px] font-extrabold tracking-tight text-zinc-950 uppercase leading-none mb-1">
                                {d.escola}
                            </h1>
                            <div className="text-[12px] font-semibold text-zinc-800">
                                CNPJ {d.cnpj}
                            </div>
                            <div className="text-[12px] font-normal text-zinc-800">
                                {d.endereco}
                            </div>
                            <div className="text-[12px] font-normal text-zinc-800">
                                {d.cidadeCep}
                            </div>
                        </div>

                        {/* Placeholder to balance the logo width */}
                        <div className="w-[100px]" />
                    </div>

                    {/* 2. TÍTULO DO DOCUMENTO COM LINHA DIVISÓRIA LARGA */}
                    <div className="flex flex-col items-center mt-6">
                        <h2 className="text-[20px] font-black uppercase tracking-widest text-zinc-950">
                            CERTIFICADO DE CONCLUSÃO
                        </h2>
                        <div className="w-full border-b-[2.5px] border-black mt-2" />
                    </div>

                    {/* 3. CORPO DO TEXTO DO CERTIFICADO */}
                    <div className="px-8 text-center text-[13.5px] text-zinc-900 font-normal leading-[1.8] mt-8">
                        Certificamos para os devidos fins, que <strong className="font-bold text-zinc-950 uppercase">{d.aluno}</strong>,
                        nascida em {d.nascimento}, natural de {d.naturalidade} filha de <span className="uppercase font-medium">{d.pai}</span> e <span className="uppercase font-medium">{d.mae}</span>,
                        concluiu a {d.serie}, no ano letivo de {d.anoLetivo}, de acordo com a Lei Federal de Diretrizes e Bases da Educação Nacional
                        (Nº 9394/96) vigente no país e com o Regimento Escolar deste Estabelecimento de Ensino.
                    </div>

                    {/* 4. LOCAL E DATA */}
                    <div className="text-center text-[13px] font-bold text-zinc-950 mt-6">
                        {d.dataLocalString}
                    </div>

                    {/* 5. ASSINATURAS */}
                    <div className="flex justify-around items-end mt-12 w-full px-4">
                        {/* Secretaria */}
                        <div className="flex flex-col items-center text-center w-[300px]">
                            <div className="w-full border-t border-zinc-800 mb-2" />
                            <div className="text-[12px] font-bold text-zinc-950">{d.secretariaNome}</div>
                            <div className="text-[11px] font-medium text-zinc-600">{d.secretariaCargo}</div>
                            <div className="text-[10px] font-normal text-zinc-500 mt-0.5">{d.secretariaReg}</div>
                        </div>

                        {/* Diretora */}
                        <div className="flex flex-col items-center text-center w-[300px]">
                            <div className="w-full border-t border-zinc-800 mb-2" />
                            <div className="text-[12px] font-bold text-zinc-950">{d.diretoraNome}</div>
                            <div className="text-[11px] font-medium text-zinc-600">{d.diretoraCargo}</div>
                            <div className="text-[10px] font-normal text-zinc-500 mt-0.5">{d.diretoraReg}</div>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};

export default CertificadoPreview;
