'use client';
import React from 'react';

export interface BoletimData {
    aluno?: string;
    matricula?: string;
    filiacao?: string;
    nascimento?: string;
    naturalidade?: string;
    emissao?: string;
    turma?: string;
    situacaoFinal?: string;
    escola?: string;
    cnpj?: string;
    endereco?: string;
    website?: string;
    diretor?: string;
    diretorCargo?: string;
    sistemaTag?: string;
    dataHoraImpressao?: string;
    disciplinas?: {
        nome: string;
        b1?: string;
        b2?: string;
        recs1?: string;
        ms1?: string;
        b3?: string;
        b4?: string;
        rcs2?: string;
        ms2?: string;
        mda?: string;
        rca?: string;
        mdfp?: string;
        rcf?: string;
        mdf?: string;
        ch?: string;
        situacao?: string;
    }[];
    total?: {
        cargaHoraria?: string;
        aulasDadas?: string;
        faltas?: string;
        frequencia?: string;
    };
}

const defaultBoletimData: BoletimData = {
    aluno: 'DIOGO LOPES DO NASCIMENTO',
    matricula: '',
    filiacao: 'CARLOS ROBERTO SANTOS DO NASCIMENTO e MARIA BETÂNIA LOPES DO NASCIMENTO',
    nascimento: '23/01/1990',
    naturalidade: 'Maceió/AL',
    emissao: '09/05/2025',
    turma: 'Ensino Médio / 3º Ano / A / 2007',
    situacaoFinal: 'APROVADO',
    escola: 'COLÉGIO SÃO JUDAS TADEU',
    cnpj: '18.212.021/0001-36',
    endereco: 'Rua Adolfo Gustavo, 435, Serraria, Maceió - AL',
    website: 'www.colegiosjtm.com.br',
    diretor: 'Maria Aparecida Lopes',
    diretorCargo: 'Direção',
    sistemaTag: 'SIGA',
    dataHoraImpressao: '09/05/2025, 17:14',
    disciplinas: [
        { nome: 'ARTES', b1: '9,0', ch: '0,00', situacao: 'Cursando' },
        { nome: 'CIÊNCIAS', b1: '6,5', ch: '0,00', situacao: 'Cursando' },
        { nome: 'ED. FISICA', b1: '10,0', ch: '0,00', situacao: 'Cursando' },
        { nome: 'E. RELIGIOSO', b1: '9,0', ch: '0,00', situacao: 'Cursando' },
        { nome: 'GEOGRAFIA', b1: '7,0', ch: '0,00', situacao: 'Cursando' },
        { nome: 'HISTÓRIA', b1: '5,3', ch: '0,00', situacao: 'Cursando' },
        { nome: 'L.E.M INGLÊS', b1: '7,3', ch: '0,00', situacao: 'Cursando' },
        { nome: 'L. PORTUGUESA', b1: '5,3', ch: '0,00', situacao: 'Cursando' },
        { nome: 'MATEMÁTICA', b1: '9,5', ch: '0,00', situacao: 'Cursando' },
        { nome: 'ROBÓTICA', b1: '7,8', ch: '80,00', situacao: 'Cursando' },
    ],
    total: {
        cargaHoraria: '80,0',
        aulasDadas: '0',
        faltas: '0',
        frequencia: '0%',
    },
};

export const BoletimPreview = ({ data }: { data?: BoletimData }) => {
    const d = { ...defaultBoletimData, ...data };
    const disciplinas = d.disciplinas || defaultBoletimData.disciplinas!;
    const total = { ...defaultBoletimData.total, ...d.total };

    return (
        <div className="w-full overflow-x-auto p-4 print:p-0 print:overflow-hidden bg-zinc-100 print:bg-white flex justify-center">
            <div className="w-[1122px] min-w-[1122px] bg-white border border-black p-6 shadow-lg print:shadow-none print:w-full print:border-none flex flex-col gap-4 text-[11px] text-black font-sans leading-tight">

                {/* 0. LINHA SUPERIOR COM DATA/HORA E TAG DO SISTEMA */}
                <div className="flex justify-between items-center text-[11px] font-normal text-black px-1">
                    <div>{d.dataHoraImpressao}</div>
                    <div>{d.sistemaTag}</div>
                </div>

                {/* 0.1 CABEÇALHO DA ESCOLA COM LOGO */}
                <div className="flex items-center justify-center relative py-2">
                    {/* Logo SJT */}
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center justify-center">
                        <svg className="w-16 h-16" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="50" cy="50" r="46" stroke="#102a45" strokeWidth="7" fill="white" />
                            <circle cx="50" cy="50" r="39" stroke="#102a45" strokeWidth="2" fill="none" />
                            <text x="50" y="59" textAnchor="middle" fill="#102a45" fontSize="30" fontWeight="900" fontFamily="sans-serif" letterSpacing="-1.5">
                                SJT
                            </text>
                        </svg>
                    </div>

                    {/* Dados do Colégio */}
                    <div className="flex flex-col items-center text-center gap-1">
                        <h1 className="text-[17px] font-bold tracking-tight text-black uppercase">
                            {d.escola}
                        </h1>
                        <div className="text-[12px] font-medium text-black">
                            CNPJ: {d.cnpj}
                        </div>
                        <div className="text-[12px] font-normal text-black">
                            {d.endereco}
                        </div>
                        <div className="text-[12px] font-normal text-black underline mt-1">
                            {d.website}
                        </div>
                    </div>
                </div>

                {/* 0.2 TÍTULO DO DOCUMENTO */}
                <div className="text-center font-bold text-[14px] uppercase tracking-wide my-1">
                    FICHA INDIVIDUAL
                </div>

                {/* 1. CABEÇALHO COM DADOS DO ALUNO */}
                <div className="border border-black grid grid-cols-1 divide-y divide-black bg-white">
                    {/* Linha 1 */}
                    <div className="grid grid-cols-[68%_32%] divide-x divide-black p-1">
                        <div className="px-1 font-normal">
                            <span className="font-bold">Aluno:</span> {d.aluno}
                        </div>
                        <div className="px-1 font-normal">
                            <span className="font-bold">Matrícula:</span> {d.matricula}
                        </div>
                    </div>

                    {/* Linha 2 */}
                    <div className="grid grid-cols-[68%_32%] divide-x divide-black p-1">
                        <div className="px-1 font-normal">
                            <span className="font-bold">Filiação:</span> {d.filiacao}
                        </div>
                        <div className="px-1 font-normal">
                            <span className="font-bold">Data de Nascimento:</span> {d.nascimento}
                        </div>
                    </div>

                    {/* Linha 3 */}
                    <div className="grid grid-cols-[68%_32%] divide-x divide-black p-1">
                        <div className="px-1 font-normal">
                            <span className="font-bold">Naturalidade:</span> {d.naturalidade}
                        </div>
                        <div className="px-1 font-normal">
                            <span className="font-bold">Data de Emissão:</span> {d.emissao}
                        </div>
                    </div>

                    {/* Linha 4 */}
                    <div className="grid grid-cols-[68%_32%] divide-x divide-black p-1">
                        <div className="px-1 font-normal">
                            <span className="font-bold">Turma:</span> {d.turma}
                        </div>
                        <div className="px-1 font-normal">
                            <span className="font-bold">Situação Final:</span> {d.situacaoFinal}
                        </div>
                    </div>
                </div>

                {/* 2. TABELA PRINCIPAL DE NOTAS E COMPONENTES CURRICULARES */}
                <div className="border border-black overflow-hidden bg-white">
                    <table className="w-full border-collapse text-center">
                        <thead>
                            <tr className="border-b border-black text-[10px] font-bold">
                                <th className="border-r border-black p-1 text-left px-2 w-[18%]">
                                    Componentes Curriculares
                                </th>
                                <th className="border-r border-black p-1 w-[5.5%]">1ºBIMESTRE</th>
                                <th className="border-r border-black p-1 w-[5.5%]">2ºBIMESTRE</th>
                                <th className="border-r border-black p-1 w-[5%]">RECS1</th>
                                <th className="border-r border-black p-1 w-[4.5%]">MS1</th>
                                <th className="border-r border-black p-1 w-[5.5%]">3ºBIMESTRE</th>
                                <th className="border-r border-black p-1 w-[5.5%]">4ºBIMESTRE</th>
                                <th className="border-r border-black p-1 w-[5%]">RCS2</th>
                                <th className="border-r border-black p-1 w-[4.5%]">MS2</th>
                                <th className="border-r border-black p-1 w-[4.5%]">MDA</th>
                                <th className="border-r border-black p-1 w-[4.5%]">RCA</th>
                                <th className="border-r border-black p-1 w-[4.5%]">MDFP</th>
                                <th className="border-r border-black p-1 w-[4.5%]">RCF</th>
                                <th className="border-r border-black p-1 w-[4.5%]">MDF</th>
                                <th className="border-r border-black p-1 w-[5%]">CH</th>
                                <th className="p-1 w-[8.5%]">Situação</th>
                            </tr>
                        </thead>
                        <tbody>
                            {disciplinas.map((disc, index) => (
                                <tr key={index} className="border-b last:border-b-0 border-black text-[11px]">
                                    <td className="border-r border-black p-1 text-left px-2 font-normal uppercase">
                                        {disc.nome}
                                    </td>
                                    <td className="border-r border-black p-1 text-center">{disc.b1 || ''}</td>
                                    <td className="border-r border-black p-1 text-center">{disc.b2 || ''}</td>
                                    <td className="border-r border-black p-1 text-center">{disc.recs1 || ''}</td>
                                    <td className="border-r border-black p-1 text-center">{disc.ms1 || ''}</td>
                                    <td className="border-r border-black p-1 text-center">{disc.b3 || ''}</td>
                                    <td className="border-r border-black p-1 text-center">{disc.b4 || ''}</td>
                                    <td className="border-r border-black p-1 text-center">{disc.rcs2 || ''}</td>
                                    <td className="border-r border-black p-1 text-center">{disc.ms2 || ''}</td>
                                    <td className="border-r border-black p-1 text-center">{disc.mda || ''}</td>
                                    <td className="border-r border-black p-1 text-center">{disc.rca || ''}</td>
                                    <td className="border-r border-black p-1 text-center">{disc.mdfp || ''}</td>
                                    <td className="border-r border-black p-1 text-center">{disc.rcf || ''}</td>
                                    <td className="border-r border-black p-1 text-center">{disc.mdf || ''}</td>
                                    <td className="border-r border-black p-1 text-center">{disc.ch || '0,00'}</td>
                                    <td className="p-1 text-center">{disc.situacao || 'Cursando'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 3. RESUMO / TOTAL */}
                <div className="flex flex-col gap-1">
                    <div className="border border-black overflow-hidden bg-white">
                        <table className="w-full border-collapse text-center text-[10px]">
                            <thead>
                                <tr className="border-b border-black font-bold">
                                    <th className="border-r border-black p-1 w-[18.1%]">Total</th>
                                    <th className="border-r border-black p-1 w-[28.5%]">Carga Horária</th>
                                    <th className="border-r border-black p-1 w-[24.7%]">Aulas Dadas</th>
                                    <th className="border-r border-black p-1 w-[13.5%]">Faltas</th>
                                    <th className="p-1 w-[14.5%]">Frequência</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr className="text-[11px]">
                                    <td className="border-r border-black p-1"></td>
                                    <td className="border-r border-black p-1">{total.cargaHoraria || '80,0'}</td>
                                    <td className="border-r border-black p-1">{total.aulasDadas || '0'}</td>
                                    <td className="border-r border-black p-1">{total.faltas || '0'}</td>
                                    <td className="p-1">{total.frequencia || '0%'}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Legenda de Rodapé */}
                    <div className="text-[10px] text-black italic">
                        (ad): aulas dadas; (f) faltas;
                    </div>
                </div>

                {/* 4. ASSINATURA DA DIREÇÃO */}
                <div className="flex flex-col items-center justify-center mt-8 mb-4">
                    <div className="w-72 border-b border-black mb-2" />
                    <div className="text-[12px] font-bold text-black">
                        {d.diretor}
                    </div>
                    <div className="text-[11px] font-medium text-black">
                        {d.diretorCargo}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default BoletimPreview;
