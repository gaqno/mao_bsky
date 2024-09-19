import { BskyAgent } from '@atproto/api';
import * as dotenv from 'dotenv';
import yahooFinance from 'yahoo-finance2';
import * as process from 'process';
import { CronJob } from 'cron';
import dayjs from 'dayjs';

dotenv.config();

const BLUESKY_USERNAME = process.env.BLUESKY_USERNAME;
const BLUESKY_PASSWORD = process.env.BLUESKY_PASSWORD;

// Cria um agente do Bluesky
const agent = new BskyAgent({
  service: 'https://bsky.social/xrpc/com.atproto.server.createSession',
});

async function fetchExchangeRates() {
  try {
    // Busca as taxas de câmbio do Yahoo Finance
    const usdToCny = await yahooFinance.quote('USDCNY=X');
    
    // A taxa de câmbio está no campo `regularMarketPrice`
    console.log('Taxa de câmbio USD/CNY:', usdToCny.regularMarketPrice);
    
    return {
      USD: 1, // USD é sempre 1, já que estamos comparando com CNY
      CNY: usdToCny.regularMarketPrice, // Taxa de câmbio atual de CNY
      previousClose: usdToCny.regularMarketPreviousClose // Preço de fechamento anterior
    };
  } catch (error) {
    console.error('Erro ao buscar as taxas de câmbio no Yahoo Finance:', error);
    throw error;
  }
}

function calculateMetrics(currentRate: number, previousRate: number) {
  // Valorização Percentual
  const growthPercentage = ((currentRate - previousRate) / previousRate) * 100;
  
  return {
    growthPercentage: growthPercentage.toFixed(2),
    currentRate,
    previousRate
  };
}

async function postToBluesky(message: string) {
  try {
    await agent.login({
      identifier: BLUESKY_USERNAME || '',
      password: BLUESKY_PASSWORD || '',
    });
    console.log('Logado no Bluesky');

    await agent.post({ text: message });
    console.log('Publicado no Bluesky');
  } catch (error) {
    console.error('Erro ao publicar no Bluesky:', error);
    throw error;
  }
}

async function main() {
  console.log('Executando a função principal...', new Date());
  try {
    // Busca as taxas de câmbio atuais e anteriores
    const rates = await fetchExchangeRates();
    const usdRate = rates.USD;
    const cnyRate = rates.CNY!;
    const previousCloseRate = rates.previousClose!;

    // Calcula as métricas
    const { growthPercentage } = calculateMetrics(cnyRate, previousCloseRate);

    // Monta a mensagem de acordo com as métricas
    const message =
      parseFloat(growthPercentage) > 0
      ? `
      🚀 O Yuan teve uma valorização impressionante de ${growthPercentage}% 
      em comparação ao fechamento anterior! 💹📈

      🇨🇳 CNY Atual: ${cnyRate}
      🇺🇸 Fechamento Anterior (USD/CNY): ${previousCloseRate}

      📅 ${dayjs().format('DD/MM/YYYY')} às ${dayjs().format('HH:mm')}
      `
      : `
      📉 O Yuan teve uma desvalorização de ${growthPercentage}% 
      em comparação ao fechamento anterior. 📉

      🇨🇳 CNY Atual: ${cnyRate}
      🇺🇸 Fechamento Anterior (USD/CNY): ${previousCloseRate}

      📅 ${dayjs().format('DD/MM/YYYY')} às ${dayjs().format('HH:mm')}
      `;

    // Publica o resultado
    console.log({ message });
    await postToBluesky(message);
  } catch (error) {
    console.error('Erro na função principal:', error);
  }
  console.log('Função principal concluída.', new Date());
}

// Define a execução em um job cron
const scheduleExpression = '0 * * * *'; // Executa de hora em hora
const job = new CronJob(scheduleExpression, main);

job.start();
