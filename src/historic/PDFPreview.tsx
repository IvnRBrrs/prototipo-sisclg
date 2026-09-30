'use client';
import React from 'react';
// import { HistoricoData } from '@/types/historico';

export interface HistoricoData {
    aluno: string;
    nascimento: string;
    pai: string;
    mae: string;
    naturalidade: string;
    disciplinas?: any[];
    cargaHoraria?: any[];
}

const historico_logo = '/stj/assets/logo.png';
const historico_logo_bandeira = '/stj/assets/bandeira.png';

const defaultDisciplinas = [
    { nome: 'LÍNGUA PORTUGUESA', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '-', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
    { nome: 'MATEMÁTICA', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '-', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
    { nome: 'HISTÓRIA', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '-', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
    { nome: 'GEOGRAFIA', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '-', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
    { nome: 'CIÊNCIAS', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '-', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
    { nome: 'ARTES', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '-', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
    { nome: 'L.E.M. INGLÊS', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '-', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
    { nome: 'CIDADANIA', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '-', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
    { nome: 'EDUCAÇÃO FÍSICA', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '-', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
    { nome: 'FILOSOFIA', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
];

const defaultCargaHoraria = [
    { nome: 'MENÇÃO FINAL', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '-', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
    { nome: 'MÉDIA GLOBAL', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '-', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
    { nome: 'DIAS LETIVOS', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '-', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
    { nome: 'TOTAL DE HORAS', n1: '-', n2: '-', n3: '-', n4: '-', n5: '-', n6: '-', n7: '-', n8: '-', n9: '-', m1: '-', m2: '-', m3: '-', ano: '-', serie: '-', escola: '-', cidade: '-', sit: '-' },
]

function formatDateBR(val: string): string {
    if (!val) return val
    const meses = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO']
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        const [y, m, d] = val.split('-')
        return `${parseInt(d)} DE ${meses[parseInt(m) - 1]} DE ${y}`
    }
    const d = new Date(val.replace(' ', 'T'))
    if (!isNaN(d.getTime())) {
        const dia = d.getDate()
        const mes = meses[d.getMonth()]
        const ano = d.getFullYear()
        return `${dia} DE ${mes} DE ${ano}`
    }
    return val
}

export const PDFPreview = ({ data }: { data: HistoricoData }) => {
    const aluno = data?.aluno || '';
    const nascimento = data?.nascimento ? formatDateBR(data.nascimento) : '';
    const pai = data?.pai || '';
    const mae = data?.mae || '';
    const naturalidade = data?.naturalidade || 'MACEIÓ/AL';
    const disciplinas = (data?.disciplinas && data.disciplinas.length > 0) ? data.disciplinas : defaultDisciplinas;
    const cargaHoraria = (data?.cargaHoraria && data.cargaHoraria.length > 0) ? data.cargaHoraria : defaultCargaHoraria;

    // 1. Obtém a data atual formatada em português
    const dataBruta = new Intl.DateTimeFormat('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).format(new Date());

    // 2. Transforma a primeira letra do mês em maiúscula (ex: "junho" -> "Junho")
    const dataFormatada = dataBruta.replace(
        /(\d+\s+de\s+)([a-z])/i,
        (_, prefixo, letra) => prefixo + letra.toUpperCase()
    );

    return (
        <div className="pdf-preview-container w-full overflow-x-auto p-4 print:p-0 print:overflow-visible bg-zinc-100 print:bg-white flex justify-center">
            <style>{`
                .pdf-preview-container * {
                    border-width: 0;
                    border-style: solid;
                    border-color: currentColor;
                    print-color-adjust: exact;
                    -webkit-print-color-adjust: exact;
                }
                .pdf-preview-container .border {
                    border-width: 1px;
                }
                .pdf-preview-container .border-r {
                    border-right-width: 1px;
                }
                .pdf-preview-container .border-black {
                    border-color: #000;
                }
                .pdf-preview-container .border-zinc-500 {
                    border-color: rgb(113 113 122);
                }
            `}</style>
            <div className="w-[1122px] min-w-[1122px] h-[793px] print:w-full print:h-screen print:p-[12mm] bg-white border border-black shadow-lg print:shadow-none flex flex-col items-center overflow-hidden print:overflow-visible p-0 text-[10px]">
                <div
                    className="grid w-full h-full text-[10px]"
                    style={{
                        gridTemplateColumns: '15% 35% 15% 35%',
                        gridTemplateRows: 'repeat(40, 1fr)',
                    }}
                >
                    {/* 1. CABEÇALHO ROXO (linhas 1 a 4) */}
                    <div className="col-span-4 row-span-4 p-1 flex flex-row items-center justify-between border border-zinc-500">
                        <div className="flex items-center justify-start h-full w-[25%] pl-2">
                            <img src="/stj/assets/logo.png" className="h-full w-auto max-h-16 object-contain" />
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="text-[14px] font-bold">COLÉGIO SÃO JUDAS TADEU</div>
                            <div className="text-[9px]">CNPJ 24.464.554/0001-08</div>
                            <div className="text-[9px]">Rua Adolfo Gustavo, 435, Serraria.</div>
                            <div className="text-[9px]">Maceió-AL, CEP 57046-341.</div>
                        </div>
                        <div className="flex items-center justify-end h-full w-[25%] pr-2">
                            <img src="/stj/assets/bandeira.png" className="h-full w-auto max-h-16 object-contain" />
                        </div>
                    </div>

                    {/* 2. DADOS DO ALUNO (linhas 5 e 6) bg-[#d8dbdf]*/}
                    <div className="col-span-2 row-start-5  flex items-center px-2 border border-zinc-500">
                        ALUNO (A): <span className="font-semibold ml-1">{aluno}</span>
                    </div>
                    <div className="col-span-2 row-start-5  flex items-center px-2 border border-zinc-500">
                        DATA DE NASCIMENTO: <span className="font-semibold ml-1">{nascimento}</span>
                    </div>
                    <div className="col-span-2 row-start-6  flex items-center px-2 border border-zinc-500">
                        NOME DO PAI: <span className="font-semibold ml-1">{pai}</span>
                    </div>
                    <div className="col-span-2 row-start-6  flex items-center px-2 border border-zinc-500">
                        NOME DA MÃE: <span className="font-semibold ml-1">{mae}</span>
                    </div>

                    {/* Linha 7 bg-[#d8dbdf]*/}
                    <div className="col-span-4 row-start-7 flex flex-row w-full border border-zinc-500">
                        <div className="w-[35%] min-w-[35%]  flex items-center px-2 border-r border-zinc-500">
                            NATURALIDADE: <span className="font-semibold ml-1">{naturalidade}</span>
                        </div>
                        <div className="w-[65%] min-w-[65%] flex items-center px-2 text-[9px] font-medium">
                            AUTORIZAÇÃO DE FUNCIONAMENTO PORTARIA 1088/2007, PUBLICADO NO DIÁRIO OFICIAL DE 11/12/2007.
                        </div>
                    </div>

                    {/* Linha 8 - Barra azul escura */}
                    <div className="col-span-4 row-start-8 bg-cyan-200 border border-zinc-500" />

                    {/* 3. CABEÇALHO DA TABELA (linhas 9 e 10) */}
                    {/* bg-[#f6dcc9] */}
                    <div className="col-span-1 row-start-9  flex items-center justify-center font-bold border border-zinc-500">
                        NOTAS E CONCEITOS
                    </div>
                    <div className="col-span-2 row-start-9 flex border border-zinc-500">
                        {/* bg-[#e1efe3] */}
                        <div className="w-[75.1%]  flex items-center justify-center font-bold border-r border-zinc-500">
                            ENSINO FUNDAMENTAL
                        </div>
                        {/* bg-[#f6dcc9] */}
                        <div className="w-[24.9%]  flex items-center justify-center font-bold">
                            ENSINO MÉDIO
                        </div>
                    </div>
                    <div className="col-span-1 row-start-9  flex items-center justify-center font-bold border border-zinc-500">
                        HISTÓRICO ANTERIOR
                    </div>
                    {/* bg-[#f6dcc9] */}
                    <div className="col-span-1 row-start-10  flex items-center justify-center font-bold border bg-cyan-200 border-zinc-500">
                        DISCIPLINAS
                    </div>
                    {/* bg-[#e1efe3]  */}
                    <div className="col-span-2 row-start-10 flex border border-zinc-500 bg-cyan-200">
                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500 text-[8px] font-semibold">1° ANO</div>
                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500 text-[8px] font-semibold">1°/2°</div>
                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500 text-[8px] font-semibold">2°/3°</div>
                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500 text-[8px] font-semibold">3°/4°</div>
                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500 text-[8px] font-semibold">4°/5°</div>
                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500 text-[8px] font-semibold">5°/6°/CH</div>
                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500 text-[8px] font-semibold">6°/7°/CH</div>
                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500 text-[8px] font-semibold">7°/8°/CH</div>
                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500 text-[8px] font-semibold">8°/9°/CH</div>
                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500 text-[8px] font-semibold">1ª SÉRIE</div>
                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500 text-[8px] font-semibold">2ª SÉRIE</div>
                        <div className="flex-1 flex items-center justify-center text-[8px] font-semibold">3ª SÉRIE</div>
                    </div>
                    {/* bg-[#e2e8f1] */}
                    <div className="col-span-1 row-start-10  flex border border-zinc-500 bg-cyan-200 text-[8px]">
                        <div className="w-[9%]  flex items-center justify-center border-r border-zinc-500 font-semibold">ANO</div>
                        <div className="w-[9%]  flex items-center justify-center border-r border-zinc-500 font-semibold">SÉRIE</div>
                        <div className="w-[46%]  flex items-center justify-center border-r border-zinc-500 font-semibold">ESCOLA</div>
                        <div className="w-[18%]  flex items-center justify-center border-r border-zinc-500 font-semibold">CIDADE/UF</div>
                        <div className="w-[16%]  flex items-center justify-center font-semibold">SIT.</div>
                    </div>

                    {/* 4. CORPO DA TABELA (linhas 11 a 39) */}
                    {Array.from({ length: 25 }).map((_, idx) => {
                        const rowIndex = 11 + idx;
                        const d = disciplinas[idx] || {};
                        const cargaStartIdx = 25 - cargaHoraria.length;
                        const isCargaRow = idx >= cargaStartIdx;
                        const ch = isCargaRow ? (cargaHoraria[idx - cargaStartIdx] || {}) : {};

                        return (
                            <React.Fragment key={idx}>
                                {/* Coluna 1 - Disciplina (primeiras 21) / Carga Horária (últimas 4) */}
                                <div
                                    className={`col-span-1 border border-zinc-500 flex items-center px-1 text-[8px] font-semibold truncate ${isCargaRow ? 'bg-cyan-200' : ''}`}
                                    style={{ gridRowStart: rowIndex }}
                                >
                                    {isCargaRow ? (ch.nome || '') : (d.nome || '')}
                                </div>

                                {/* Colunas 2 & 3 - Notas e Médias (primeiras 21 linhas) */}
                                {!isCargaRow && (
                                    <div
                                        className="col-span-2  border border-zinc-500 flex text-[8px]"
                                        style={{ gridRowStart: rowIndex }}
                                    >
                                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500">{d.n1 || ''}</div>
                                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500">{d.n2 || ''}</div>
                                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500">{d.n3 || ''}</div>
                                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500">{d.n4 || ''}</div>
                                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500">{d.n5 || ''}</div>
                                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500">{d.n6 || ''}</div>
                                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500">{d.n7 || ''}</div>
                                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500">{d.n8 || ''}</div>
                                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500">{d.n9 || ''}</div>
                                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500">{d.m1 || ''}</div>
                                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500">{d.m2 || ''}</div>
                                        <div className="flex-1 flex items-center justify-center">{d.m3 || ''}</div>
                                    </div>
                                )}

                                {/* Colunas 2 & 3 - Carga Horária (últimas 4 linhas) */}
                                {isCargaRow && (
                                    <div
                                        className="col-span-2 bg-cyan-200 border border-zinc-500 flex text-[8px]"
                                        style={{ gridRowStart: rowIndex }}
                                    >
                                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500">{ch.n1 || ''}</div>
                                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500">{ch.n2 || ''}</div>
                                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500">{ch.n3 || ''}</div>
                                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500">{ch.n4 || ''}</div>
                                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500">{ch.n5 || ''}</div>
                                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500">{ch.n6 || ''}</div>
                                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500">{ch.n7 || ''}</div>
                                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500">{ch.n8 || ''}</div>
                                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500">{ch.n9 || ''}</div>
                                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500">{ch.m1 || ''}</div>
                                        <div className="flex-1 flex items-center justify-center border-r border-zinc-500">{ch.m2 || ''}</div>
                                        <div className="flex-1 flex items-center justify-center">{ch.m3 || ''}</div>
                                    </div>
                                )}

                                {/* Coluna 4 - Histórico Anterior (apenas para as 15 primeiras linhas) bg-[#e2e8f1] */}
                                {idx < 15 ? (
                                    <div
                                        className="col-span-1  border border-zinc-500 flex text-[8px]"
                                        style={{ gridRowStart: rowIndex }}
                                    >
                                        <div className="w-[9%] flex items-center justify-center border-r border-zinc-500">{d.ano || ''}</div>
                                        <div className="w-[9%] flex items-center justify-center border-r border-zinc-500">{d.serie || ''}</div>
                                        <div className="w-[46%] flex items-center justify-center border-r border-zinc-500 px-1 truncate">{d.escola || ''}</div>
                                        <div className="w-[18%] flex items-center justify-center border-r border-zinc-500">{d.cidade || ''}</div>
                                        <div className="w-[16%] flex items-center justify-center">{d.sit || ''}</div>
                                    </div>
                                ) : null}
                            </React.Fragment>
                        );
                    })}

                    {/* Bloco de Observações (Coluna 4, da linha 26 à 39) bg-[#b0d2e5]*/}
                    <div className="col-span-1 row-start-26 row-span-10  border border-zinc-500 flex flex-col items-center p-2 text-center text-[8px] leading-tight">
                        <div className="font-bold mb-1">OBSERVAÇÕES</div>
                        <p className="mb-1">
                            1°, 2° E 4° Ano – APC Aluno aprovado em progressão continuada em consonância à resolução CEB/CEE/AL N°n08/2007.
                            3° e 5° Ano – O aluno será aprovado se obtiver Média Global Final igual ou superior a 6,0.
                            6° ao 9° ano e Ensino Médio – Média Anual igual ou superior a 6,0 em cada componente curricular.
                            * Frequência obrigatória de 75% no total de horas letivas.
                        </p>
                        <p className="mb-1">
                            Considerando a Lei 9394/96 art. 24, Inc VII; o Parecer CNE 05/97; a Resolução CEE/AL Nº 51/2002 e o que determina a Portaria Seduc/AL Nº 7.132/2020, Art. 1º A verificação da regularidade e autenticidade da vida escolar far-se-á exclusivamente na escola, atesto a autenticidade do documento.
                        </p>
                        <div className="font-bold uppercase mt-1">ESPAÇO RESERVADO PARA A SECRETARIA DE EDUCAÇÃO DO ESTADO</div>
                    </div>

                    {/* 5. RODAPÉ (linhas 40 a 44) bg-[#dfd6e2]*/}
                    <div className="col-span-4 row-start-36 row-span-5  border border-zinc-500 flex justify-between items-center px-6 text-[10px]">
                        <div className="flex flex-col items-center justify-center text-center w-[35%] pt-3">
                            <div>___________________________________________________________________</div>
                            <div className="font-bold">Monica Barros da Silva</div>
                            <div className="text-[9px]">Secretária</div>
                            <div className="text-[9px] text-zinc-600">Reg. 187/04 DS/AL</div>
                        </div>

                        <div className="flex items-center justify-center font-bold text-center w-[30%]">
                            Maceió-AL, {dataFormatada}
                        </div>

                        <div className="flex flex-col items-center justify-center text-center w-[35%] pt-3">
                            <div>___________________________________________________________________</div>
                            <div className="font-bold">Maria Aparecida Lopes</div>
                            <div className="text-[9px]">Diretora</div>
                            <div className="text-[9px] text-zinc-600">Nº 353/87 – LP 4205</div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default PDFPreview;
