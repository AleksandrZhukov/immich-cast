import axios from 'axios';
import Fastify from 'fastify';

import 'dotenv/config';

const fastify = Fastify({
  logger: true,
});

const api = axios.create({
  baseURL: 'http://192.168.1.93:2283/api',
  headers: {
    Accept: 'application/json',
    'x-api-key': process.env.IMMICH_HUB_API_KEY,
  },
});

fastify.get('/images', async (_, res) => {
  console.log('343f,', '222');
  const searchResult = await api.post('/search/random', { isVisible: true, size: 3 });

  return res.send(searchResult.data);
  // searchResult.data.map(async (asset) => {
  //   const assetData = await api.get(`/assets/${asset.id}/thumbnail?size=preview`, {
  //     responseType: 'arraybuffer',
  //   });
  //   return Buffer.from(assetData.data);
  // });

  // Set appropriate headers for the response
  // res.header('Content-Type', 'image/webp'); // Change this based on the actual content type
  // res.header('Content-Length', buffer.length);
  //
  // // Send the binary data directly to the client
  // res.send(buffer);

  // res
  //   .header('Content-Type', 'image/webp') // Replace with the correct Content-Type
  //   .header('Content-Length', buffer.length)
  //   .send(buffer); // Send the binary data
  // const url = URL.createObjectURL(assetData.data);
  // console.log('data', assetData.data, url);
  // return res.send(assetData.data);
});

fastify.get('/images/:id', async ({ params }, res) => {
  console.log(params);
  const assetData = await api.get(`/assets/${params.id}/thumbnail?size=preview`, {
    responseType: 'arraybuffer',
  });
  const buffer = Buffer.from(assetData.data);

  res
    .header('Content-Type', 'image/webp') // Replace with the correct Content-Type
    .header('Content-Length', buffer.length)
    .send(buffer); // Send the binary data
});

const reverseGeocode = async (lat: number, lon: number) => {
  return axios
    .get(`https://nominatim.openstreetmap.org/reverse`, {
      params: {
        format: 'jsonv2',
        addressdetails: 1,
        lat,
        lon,
        'accept-language': 'en',
      },
    })
    .then((res) => res.data);
};

fastify.get('/images/:id/info', async ({ params }, res) => {
  console.log('params', params);
  const assetResp = await api.get(`/assets/${params.id}`);
  const assetData = assetResp.data;
  let location = null;
  if (assetData.exifInfo.latitude) {
    location = await reverseGeocode(assetData.exifInfo.latitude, assetData.exifInfo.longitude);
    console.log('location', location);
    // await api
    // .get(`/map/reverse-geocode`, {
    //   params: {
    //     lat: assetData.exifInfo.latitude,
    //     lon: assetData.exifInfo.longitude,
    //   },
    // })
    // .then((res) => res.data[0]);
  }

  res.send({ ...assetData, location }); // Send the binary data
});

try {
  await api.post('/auth/validateToken');
  await fastify.listen({ port: 2284 });
} catch (err) {
  console.log('eee', err);
  fastify.log.error(err);
  process.exit(1);
}
