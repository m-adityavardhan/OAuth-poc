# OAuth 2.0 Proof-of-Concept (PoC)

This project is a proof-of-concept implementation of an OAuth 2.0 Authorization Server using Node.js and Express. It demonstrates how to implement core OAuth 2.0 endpoints such as the Authorization Endpoint and Token Endpoint. The project also shows how to issue JWT access tokens and (optionally) refresh tokens.

## Features

- **Authorization Endpoint** (`GET /api/oauth/authorize`)
  - Validates client credentials and redirect URIs.
  - Issues an authorization code via a 302 redirect.
- **Token Endpoint** (`POST /api/oauth/token`)
  - Exchanges the authorization code for an access token (and refresh token if implemented).
  - Uses JWT for access tokens signed with either RSA (RS256) or EC (ES256) algorithms.
- Environment variable management with [dotenv](https://www.npmjs.com/package/dotenv).

## Requirements

- Node.js (v14+ recommended)
- npm or yarn
- OpenSSL (for generating RSA/EC keys)

## Installation

1. **Clone the repository:**

   git clone https://github.com/yourusername/oauth_poc.git
   cd oauth_poc

2. **Install dependencies:**

```bash
   npm install
```

3. **Set up your environment variables:**

   Create a `.env` file in the project root with the following contents:

```env
   PORT=8080
   JWT_PRIVATE_KEY=LS0tLS1CRUdJTiBFQyBQUklWQVRFIEtFWS0tLS0tDQpNSGNDQVFFRUlFTWRnb25QNEU0cEh0OGYxMUFUeEYyR1cycHArMjhJQ3E5YmYyeEZIb0lrb0FvR0NDcUdTTTQ5DQpBd0VIb1VRRFFnQUVFQVFSUjVxc1lrQi9tdkQ3c0hqdHFwenpycVFOMGJoMFFuWVlQT2hZaWlmS2RjcEZjNDdVDQo3MUV5U1FCcytMRTlpTEMveHE2SDYwQlBQaHVKTlJlNllRPT0NCi0tLS0tRU5EIEVDIFBSSVZBVEUgS0VZLS0tLS0NCg==
```

   > **Note:**  
   The `JWT_PRIVATE_KEY` above is a base64-encoded PEM string. If you generated your own key, update this variable accordingly. If you have a PEM-formatted key, store it with escaped newlines or base64-encode it.

4. **Generate Keys:**

   ### Using an EC Key (Recommended)
   If you prefer to use an Elliptic Curve (EC) key (which is efficient and secure), generate one in PEM format by running:
   
```bash
   openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -pkeyopt ec_param_enc:explicit -out ec_private_key.pem
```

   Then, if needed, base64-encode the key:
   
```bash
   base64 ec_private_key.pem > ec_private_key.pem.base64
```

   Copy the contents of `ec_private_key.pem.base64` into your `.env` file as the value for `JWT_PRIVATE_KEY`.
   
   > **Note:** When using an EC key, update your JWT signing code to use the appropriate algorithm (e.g., `ES256`). For example:
    > 
    > const token = await new SignJWT(payload)
    >   .setProtectedHeader({ alg: 'ES256' })
    >   .setExpirationTime('5m')
    >   .sign(privateKey);

   ### Using an RSA Key (Optional)
   
   Alternatively, if you prefer to use an RSA key, generate one in PEM format by running:
   
```bash
   openssl genpkey -algorithm RSA -out private_key.pem -pkeyopt rsa_keygen_bits:2048
```

   Then, if needed, base64-encode the key:

```bash
   base64 private_key.pem > private_key.pem.base64
```

   Copy the contents of `private_key.pem.base64` into your `.env` file as the value for `JWT_PRIVATE_KEY`.
   
   > **Note:** When using an RSA key, ensure your JWT signing code uses the `RS256` algorithm.

## Endpoints

### 1. Authorization Endpoint

- **URL:** `GET http://localhost:8080/api/oauth/authorize`
- **Description:**  
  Validates the OAuth 2.0 authorization request. The request must include the following query parameters:
  - `response_type=code`
  - `client_id`
  - `redirect_uri`
  - `state`

- **Example Request:**

```bash
  GET http://localhost:8080/api/oauth/authorize?response_type=code&client_id=upfirst&redirect_uri=http://localhost:8081/process&state=SOME_STATE
```

- **Expected Behavior:**  
  If the client and parameters are valid, the server will redirect (HTTP 302) to the provided `redirect_uri` with an appended `code` and `state` parameter.

### 2. Token Endpoint

- **URL:** `POST http://localhost:8080/api/oauth/token`
- **Description:**  
  Processes the OAuth 2.0 Access Token Request. Accepts form-encoded data with the following parameters:
  - `grant_type=authorization_code`
  - `code`
  - `client_id`
  - `redirect_uri`

- **Headers:**

```
  Content-Type: application/x-www-form-urlencoded
```

- **Example Request Body:**

```
  grant_type=authorization_code&code=SOME_CODE&client_id=upfirst&redirect_uri=http://localhost:8081/process
```

- **Expected Response:**

```json
  {
    "access_token": "SOME_JWT_ACCESS_TOKEN",
    "token_type": "bearer",
    "expires_in": 3600,
    "refresh_token": "SOME_REFRESH_TOKEN"
  }
```

## Testing the Endpoints

### Using cURL

**Authorization Endpoint:**

```bash
curl -v "http://localhost:8080/api/oauth/authorize?response_type=code&client_id=upfirst&redirect_uri=http://localhost:8081/process&state=SOME_STATE"
```

**Token Endpoint:**

```bash
curl -X POST \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=SOME_CODE" \
  -d "client_id=upfirst" \
  -d "redirect_uri=http://localhost:8081/process" \
  http://localhost:8080/api/oauth/token
```

### Using Postman

- Create a new request.
- For the **Authorization Endpoint**, use `GET` with query parameters.
- For the **Token Endpoint**, set the method to `POST`, the header `Content-Type` to `application/x-www-form-urlencoded`, and add the necessary form data.

**Bonus:** A Postman collection is included in the repository, containing pre-configured requests and tests for all the OAuth endpoints. Simply import the collection into Postman to quickly verify and experiment with the API.

## Running the Project

1. **Run the Server:**

```bash
   npm run build   # if you're using TypeScript and need to compile
   npm start
```

2. The server should now be running at `http://localhost:8080`.


## Contributing

Feel free to fork this repository and submit pull requests. For any major changes, please open an issue first to discuss what you would like to change.

---

Happy coding!
```
Feel free to adjust the content to match your project's specifics and add any additional sections or instructions as needed.