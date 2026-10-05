# Library Books REST API

This API manages books in a library system.

## Endpoints

### 1. List all books

* **Method:** `GET`
* **Path:** `/books`
* **Description:** Returns a list of all books in the library.
* **Success status:** `200 OK`

### 2. Get one book

* **Method:** `GET`
* **Path:** `/books/{id}`
* **Description:** Returns one book using its unique ID.
* **Success status:** `200 OK`

### 3. Create a book

* **Method:** `POST`
* **Path:** `/books`
* **Description:** Creates a new book in the library.

**Request body:**

```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "published_year": 1958
}
```

* **Success status:** `201 Created`

### 4. Update a book

* **Method:** `PUT`
* **Path:** `/books/{id}`
* **Description:** Updates an existing book using its unique ID.

**Request body:**

```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "published_year": 1958
}
```

* **Success status:** `200 OK`

### 5. Delete a book

* **Method:** `DELETE`
* **Path:** `/books/{id}`
* **Description:** Deletes a book using its unique ID.
* **Success status:** `204 No Content`

### 6. List books by author

* **Method:** `GET`
* **Path:** `/books?author=Chinua%20Achebe`
* **Description:** Returns all books written by the specified author.
* **Success status:** `200 OK`

## Error Codes

### 400 Bad Request

This error occurs when the request contains invalid or missing data.

**Example:** Creating a book without providing a title.

```json
{
  "author": "Chinua Achebe",
  "published_year": 1958
}
```

Response:

```text
400 Bad Request
```

### 404 Not Found

This error occurs when a requested book does not exist.

**Example:**

```text
GET /books/999
```

when there is no book with ID `999`.

Response:

```text
404 Not Found
```

