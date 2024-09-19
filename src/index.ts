import { BskyAgent } from '@atproto/api';
import * as dotenv from 'dotenv';
import axios from 'axios';
import * as process from 'process';
import { CronJob } from 'cron';

dotenv.config();

const API_URL = 'https://api.exchangeratesapi.io/latest'; // Substitua pelo seu URL de API de câmbio
const API_KEY = process.env.EXCHANGE_RATE_API_KEY; // Sua chave de API aqui
const BLUESKY_USERNAME = process.env.BLUESKY_USERNAME;
const BLUESKY_PASSWORD = process.env.BLUESKY_PASSWORD;

// Cria um agente do Bluesky
const agent = new BskyAgent({
  service: 'https://bsky.social/xrpc/com.atproto.server.createSession',
});

async function fetchExchangeRates() {
  try {
    const response = await axios.get(API_URL, {
      params: {
        access_key: API_KEY,
        symbols: 'USD,CNY', // Solicita apenas USD e CNY
      },
    });
    return response.data.rates;
  } catch (error) {
    console.error('Erro ao buscar as taxas de câmbio:', error);
    throw error;
  }
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
    const rates = await fetchExchangeRates();
    const usdRate = rates?.USD;
    const cnyRate = rates?.CNY;

    const growthPercentage = ((cnyRate - usdRate) / usdRate) * 100;

    const message =
      growthPercentage > 0
        ? `
      🚀 O Yuan teve uma valorização impressionante de ${growthPercentage.toFixed(2)}% 
      em comparação ao dólar americano! 💹📈

      📊 Fórmula: (CNY - USD) / USD * 100
      🇨🇳 CNY: ${cnyRate}
      🇺🇸 USD: ${usdRate}

      📅 ${new Date().toLocaleDateString()} às ${new Date().toLocaleTimeString()}
      `
        : `📉 O Yuan caiu ${Math.abs(growthPercentage).toFixed(2)}% em relação ao dólar!`;

    // Publica o resultado
    console.log({ message });
    await postToBluesky(message);
  } catch (error) {
    console.error('Erro na função principal:', error);
  }
  console.log('Função principal concluída.', new Date());
}

main();