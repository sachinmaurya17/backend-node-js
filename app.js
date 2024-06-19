const express = require('express');
const axios = require('axios');
const app = express();
const port = 3000;
const { v4: uuidv4 } = require('uuid');
const { MongoClient } = require('mongodb');
const uri = 'mongodb://localhost:27017';


app.use(express.json());


const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

app.get('/categories/:categoryname/products', async (req, res) => {
  const { categoryname } = req.params;
  const { n } = req.query;

  try {
    const bearer_token = await auth_token();

    const externalApiUrlFLP = 'http://20.244.56.144/test/companies/FLP/categories/${categoryname}/products';
    const externalApiUrlAMZ = 'http://20.244.56.144/test/companies/AMZ/categories/${categoryname}/products';
    const externalApiUrlSNP = 'http://20.244.56.144/test/companies/SNP/categories/${categoryname}/products';
    const externalApiUrlMYN = 'http://20.244.56.144/test/companies/MYN/categories/${categoryname}/products';
    const externalApiUrlAZO = 'http://20.244.56.144/test/companies/AZO/categories/${categoryname}/products';
    const queryParams = {
      top: n,
      minPrice: 1,
      maxPrice: 10000
    };

    let responseFLP = await axios.get(externalApiUrlFLP, {
      headers: {
        'Authorization': bearer_token
      },
      params: queryParams
    });
    let flp = modifyProducts(responseFLP.data,"FLP");

    let responseSNP = await axios.get(externalApiUrlSNP, {
        headers: {
          'Authorization': bearer_token
        },
        params: queryParams
    });
    
    let snp = modifyProducts(responseSNP.data,"SNP");


    let responseMYN = await axios.get(externalApiUrlMYN, {
        headers: {
          'Authorization': bearer_token
        },
        params: queryParams
    });
    
    let myn = modifyProducts(responseMYN.data,"MYN");


    let responseAZO = await axios.get(externalApiUrlAZO, {
        headers: {
          'Authorization': bearer_token
        },
        params: queryParams
    });


    let azo = modifyProducts(responseAZO.data,"AZO");

    let responseAMZ = await axios.get(externalApiUrlAMZ, {
        headers: {
          'Authorization': bearer_token
        },
        params: queryParams
    });
 
    let amz = modifyProducts(responseAMZ.data,"AMZ");
    let mergedProducts = [...amz, ...azo,...myn,...snp,...flp];
    connectAndInsert(mergedProducts).catch(console.error);
    let fProducts = modifyProducts(mergedProducts);
    if (n > 10) {
        const page = req.query.page ? parseInt(req.query.page) : 1;
        const startIndex = (page - 1) * n;
        const endIndex = page * n;
        const paginatedProducts = fProducts.slice(startIndex, endIndex);
        res.json({
            success: true,
            message: `Paginated results for ${categoryname}`,
            data: paginatedProducts
        });
    } else {
        res.json({
            success: true,
            message: `Non-paginated results for ${categoryname}`,
            data: fProducts.slice(0,11)
        });
    }


    res.send(mergedProducts);

  } catch (error) {
    console.error('Error fetching data from external API:', error);
    res.status(500).json({ error: 'Failed to fetch data from external API' });
  }
});


app.get("/categories/:categoryname/products/:productid",async(req,res) => {
    const { productid } = req.params;
    return findProductById(productid);
});

async function findProductById(productId) {
    try {
        const database = client.db('dev-test-api');
        const collection = database.collection('product_details');

        const product = await collection.findOne({ id: ObjectId(productId) });

        if (product) {
            console.log('Found product:', product);
        } else {
            console.log('Product not found');
        }

        return product;
    } catch (error) {
        console.error('Error finding product by productId:', error);
        throw error;
    }
}




function modifyProducts(products,companyCode) {
    if (products.length > 0) {
      products.forEach(product => {
        product.company = companyCode;
        product.id = uuidv4();
      });
    }
    return products;
  }


const auth_token = async () => {
    const authUrl = 'http://20.244.56.144/test/auth';
    const authBody = {
      "companyName": "affordmed",
      "clientID": "4fa3a892-41bb-480f-9af6-f7f438ad3095",
      "clientSecret": "eMCbISwkisvPEzOP",
      "ownerName": "Saurabh maurya",
      "ownerEmail": "210303105504@paruluniversity.ac.in",
      "rollNo": "210303105504"
    };
  
    try {
      const response = await axios.post(authUrl, authBody);
      return `Bearer ${response.data.access_token}`;
    } catch (error) {
      console.error('Error generating access token:', error);
      throw new Error('Failed to generate access token');
    }
};


function mergeSort(arr) {

  if (arr.length <= 1) {
    return arr;
  }

  const mid = Math.floor(arr.length / 2);
  const leftHalf = arr.slice(0, mid);
  const rightHalf = arr.slice(mid);

  const sortedLeft = mergeSort(leftHalf);
  const sortedRight = mergeSort(rightHalf);

  return merge(sortedLeft, sortedRight);
}

function merge(left, right) {
  let result = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex].price >= right[rightIndex].price) {
      result.push(left[leftIndex]);
      leftIndex++;
    } else {
      result.push(right[rightIndex]);
      rightIndex++;
    }
  }

  while (leftIndex < left.length) {
    result.push(left[leftIndex]);
    leftIndex++;
  }

  while (rightIndex < right.length) {
    result.push(right[rightIndex]);
    rightIndex++;
  }

  return result;
}


async function connectAndInsert(dataToInsert) {
    try {
      await client.connect();
      console.log('Connected to MongoDB');
  
      const database = client.db('dev-test-api'); 
      const collection = database.collection('product_details'); // Replace with your collection name
  
      const result = await collection.insertMany(dataToInsert);
      console.log(`${result.insertedCount} documents inserted`);
  
    } catch (error) {
      console.error('Error inserting documents:', error);
    } finally {
      await client.close();
      console.log('MongoDB connection closed');
    }
}
  



app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
