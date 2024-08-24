const bookList = document.getElementById('book-list');
const authorFilter = document.getElementById('author-filter');
let db;

// Inicializar IndexedDB
const request = indexedDB.open('bookDatabase', 1);

request.onupgradeneeded = function(event) {
    db = event.target.result;
    db.createObjectStore('books', { keyPath: 'id' });
};

request.onsuccess = function(event) {
    db = event.target.result;
    updateBookList();
    updateAuthorFilter();
};

request.onerror = function(event) {
    console.error('Error al abrir IndexedDB:', event.target.errorCode);
};

// Agregar un libro
function addBook() {
    const title = document.getElementById('title').value;
    const author = document.getElementById('author').value;
    const cover = document.getElementById('cover').value;

    if (title && author && cover) {
        const transaction = db.transaction(['books'], 'readwrite');
        const objectStore = transaction.objectStore('books');
        const book = { id: Date.now().toString(), title, author, cover, liked: false, disliked: false };

        const request = objectStore.put(book);

        request.onsuccess = function() {
            updateBookList();
            updateAuthorFilter();
            document.getElementById('title').value = '';
            document.getElementById('author').value = '';
            document.getElementById('cover').value = '';
        };

        request.onerror = function(event) {
            console.error('Error al guardar el libro en IndexedDB:', event.target.errorCode);
        };
    }
}

// Actualizar la lista de libros
function updateBookList() {
    const transaction = db.transaction(['books'], 'readonly');
    const objectStore = transaction.objectStore('books');
    const request = objectStore.getAll();

    request.onsuccess = function(event) {
        const books = event.target.result;
        bookList.innerHTML = '';
        books.forEach((book) => {
            const bookItem = createBookElement(book);
            bookList.appendChild(bookItem);
        });
    };

    request.onerror = function(event) {
        console.error('Error al recuperar la lista de libros:', event.target.errorCode);
    };
}

// Crear un elemento de libro
function createBookElement(book) {
    const bookItem = document.createElement('div');
    bookItem.className = 'book-item';
    bookItem.innerHTML = `
        <img src="${book.cover}" alt="${book.title}">
        <p><strong>${book.title}</strong></p>
        <p>${book.author}</p>
        <label class="like-checkbox">
            <input type="checkbox" ${book.liked ? 'checked' : ''} onchange="toggleLike('${book.id}')"> M'agrada
        </label>
        <label class="dislike-checkbox">
            <input type="checkbox" ${book.disliked ? 'checked' : ''} onchange="toggleDislike('${book.id}')"> No m'agrada
        </label>
        <div>
            <button onclick="editBook('${book.id}')">Editar</button>
            <button onclick="deleteBook('${book.id}')">Esborrar</button>
        </div>
    `;
    return bookItem;
}

// Editar un libro
function editBook(id) {
    const transaction = db.transaction(['books'], 'readwrite');
    const objectStore = transaction.objectStore('books');
    const request = objectStore.get(id);

    request.onsuccess = function(event) {
        const book = event.target.result;
        const newTitle = prompt('Introdueix el nou títol del llibre', book.title);
        const newAuthor = prompt('Introdueix el nou autor del llibre', book.author);
        const newCover = prompt('Introdueix la nova URL de la portada', book.cover);

        if (newTitle !== null && newAuthor !== null && newCover !== null) {
            book.title = newTitle;
            book.author = newAuthor;
            book.cover = newCover;

            const putRequest = objectStore.put(book);
            putRequest.onsuccess = function() {
                updateBookList();
            };
            putRequest.onerror = function(event) {
                console.error('Error al editar el libro:', event.target.errorCode);
            };
        }
    };
}

// Eliminar un libro
function deleteBook(id) {
    const confirmDelete = confirm(`Estàs segur d'esborrar aquest llibre?`);
    if (confirmDelete) {
        const transaction = db.transaction(['books'], 'readwrite');
        const objectStore = transaction.objectStore('books');
        const request = objectStore.delete(id);

        request.onsuccess = function() {
            updateBookList();
        };

        request.onerror = function(event) {
            console.error('Error al eliminar el libro:', event.target.errorCode);
        };
    }
}

// Alternar like
function toggleLike(id) {
    const transaction = db.transaction(['books'], 'readwrite');
    const objectStore = transaction.objectStore('books');
    const request = objectStore.get(id);

    request.onsuccess = function(event) {
        const book = event.target.result;
        book.liked = !book.liked;
        if (book.liked) {
            book.disliked = false;
        }
        const putRequest = objectStore.put(book);
        putRequest.onsuccess = function() {
            updateBookList();
        };
    };

    request.onerror = function(event) {
        console.error('Error al alternar like:', event.target.errorCode);
    };
}

// Alternar dislike
function toggleDislike(id) {
    const transaction = db.transaction(['books'], 'readwrite');
    const objectStore = transaction.objectStore('books');
    const request = objectStore.get(id);

    request.onsuccess = function(event) {
        const book = event.target.result;
        book.disliked = !book.disliked;
        if (book.disliked) {
            book.liked = false;
        }
        const putRequest = objectStore.put(book);
        putRequest.onsuccess = function() {
            updateBookList();
        };
    };

    request.onerror = function(event) {
        console.error('Error al alternar dislike:', event.target.errorCode);
    };
}

// Actualizar el filtro por autor
function updateAuthorFilter() {
    const transaction = db.transaction(['books'], 'readonly');
    const objectStore = transaction.objectStore('books');
    const request = objectStore.getAll();

    request.onsuccess = function(event) {
        const books = event.target.result;
        const authors = [...new Set(books.map(book => book.author))].sort();

        authorFilter.innerHTML = '<option value="">Filtrar per autor</option>';
        authors.forEach(author => {
            const option = document.createElement('option');
            option.value = author;
            option.textContent = author;
            authorFilter.appendChild(option);
        });
    };

    request.onerror = function(event) {
        console.error('Error al actualizar el filtro por autor:', event.target.errorCode);
    };
}

// Filtrar por autor
function filterByAuthor() {
    const selectedAuthor = authorFilter.value.trim();

    const transaction = db.transaction(['books'], 'readonly');
    const objectStore = transaction.objectStore('books');
    const request = objectStore.getAll();

    request.onsuccess = function(event) {
        const books = event.target.result;
        const filteredBooks = books.filter(book => {
            return book.author.trim().toLowerCase() === selectedAuthor.toLowerCase();
        });

        updateBookListFiltered(filteredBooks);
    };

    request.onerror = function(event) {
        console.error('Error al filtrar por autor:', event.target.errorCode);
    };
}

// Actualizar la lista filtrada
function updateBookListFiltered(filteredBooks) {
    bookList.innerHTML = '';

    if (filteredBooks.length === 0) {
        const noResultsItem = document.createElement('div');
        noResultsItem.textContent = 'No hay libros para este autor.';
        bookList.appendChild(noResultsItem);
    } else {
        filteredBooks.forEach((book) => {
            const bookItem = createBookElement(book);
            bookList.appendChild(bookItem);
        });
    }
}
