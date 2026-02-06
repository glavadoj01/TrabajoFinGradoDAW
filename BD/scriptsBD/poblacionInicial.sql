/* ============================
   USUARIOS
   ============================ */
INSERT INTO usuario (nombre_usuario, nombre_real, apellido) VALUES
('usuario1', 'Usuario1', 'Apellido Uno'),
('usuario2', 'Usuario2', 'Apellido Dos'),
('usuario3', 'Usuario3', 'Apellido Tres'),
('usuario4', 'Usuario4', 'Apellido Cuatro');

/* ============================
   GENEROS
   ============================ */
INSERT INTO genero (nombre_genero, descripcion_genero) VALUES
('Fantasía', 'Obras con elementos mágicos o irreales'),
('Ciencia Ficción', 'Narrativas futuristas o tecnológicas'),
('Terror', 'Historias diseñadas para causar miedo'),
('Novela Histórica', 'Relatos ambientados en épocas pasadas'),
('Misterio', 'Tramas centradas en resolver enigmas');

/* ============================
   AUTORES (reales + inventados)
   ============================ */
INSERT INTO autor (id_usuario, nombre_autor, apellido_autor, pais_autor, esUsuario) VALUES
(NULL, 'J.R.R.', 'Tolkien', 'Reino Unido', FALSE),
(NULL, 'Isaac', 'Asimov', 'Rusia/EEUU', FALSE),
(NULL, 'Stephen', 'King', 'EEUU', FALSE),
(1, 'Usuario1', 'Apellido Uno', 'España', TRUE),     -- autor vinculado a usuario1
(NULL, 'Ana', 'Martínez', 'España', FALSE); -- autora inventada

/* ============================
   LIBROS (reales + inventados)
   ============================ */
INSERT INTO libro (titulo_libro, paginas, year_publicacion, sinopsis) VALUES
('El Señor de los Anillos', 1200, 1954, 'La Comunidad del Anillo y la lucha contra Sauron.'),
('Fundación', 255, 1951, 'El declive del Imperio Galáctico.'),
('It', 1138, 1986, 'Un ente maligno aterroriza Derry.'),
('La Sombra del Viento', 565, 2001, 'Un libro misterioso cambia la vida de un joven.'),
('Libro Placeholder A', NULL, NULL, NULL),
('Libro Placeholder B', 300, 2020, 'Libro inventado para pruebas.');

/* ============================
   RELACIÓN A: LIBRO-GENERO
   ============================ */
INSERT INTO libro_genero VALUES
(1, 1), -- LOTR → Fantasía
(1, 4), -- LOTR → Histórica (ambientación)
(2, 2), -- Fundación → Ciencia Ficción
(3, 3), -- It → Terror
(4, 5), -- La Sombra del Viento → Misterio
(5, 1), -- Placeholder A → Fantasía
(6, 2); -- Placeholder B → Ciencia Ficción

/* ============================
   RELACIÓN B: LIBRO-AUTOR
   ============================ */
INSERT INTO libro_autor VALUES
(1, 1, TRUE),  -- LOTR → Tolkien
(2, 2, TRUE),  -- Fundación → Asimov
(3, 3, TRUE),  -- It → King
(4, 5, TRUE),  -- Sombra del Viento → autora inventada
(5, 4, TRUE),  -- Placeholder A → Usuario1 como autor
(6, 5, TRUE);  -- Placeholder B → autora inventada

/* ============================
   LISTAS
   ============================ */
INSERT INTO lista (id_usuario, nombre_lista, descripcion_lista) VALUES
(1, 'Favoritos de Usuario1', 'Mis libros preferidos'),
(2, 'Lecturas 2024', 'Libros que quiero leer este año'),
(3, 'Terror y Misterio', 'Selección de libros oscuros'),
(4, 'Ciencia Ficción Top', 'Mis recomendaciones de Sci-Fi');

/* ============================
   RELACIÓN C: LISTA-CONTENIDO
   ============================ */
INSERT INTO lista_contenido VALUES
(1, 1), -- usuario1 → LOTR
(1, 4), -- usuario1 → Sombra del Viento
(2, 2), -- usuario2 → Fundación
(2, 5), -- usuario2 → Placeholder A
(3, 3), -- usuario3 → It
(3, 4), -- usuario3 → Sombra del Viento
(4, 2), -- usuario4 → Fundación
(4, 6); -- usuario4 → Placeholder B

/* ============================
   RELACIÓN D: LIBRO-USUARIO (estado lectura)
   ============================ */
INSERT INTO libro_usuario VALUES
(1, 1, TRUE),
(1, 2, FALSE),
(2, 1, TRUE),
(3, 3, FALSE),
(4, 4, TRUE),
(5, 2, FALSE),
(6, 3, TRUE);

/* ============================
   RELACIÓN E: LIBRO-CRITICA
   ============================ */
INSERT INTO libro_critica VALUES
(1, 1, 'Obra maestra', 'Un clásico imprescindible.', 5),
(2, 2, 'Muy interesante', 'Gran ciencia ficción.', 4),
(3, 3, NULL, NULL, 3), -- sin texto
(4, 4, 'Excelente', 'Muy recomendable.', 5);

/* ============================
   RELACIÓN F: LISTA-COMENTARIO
   ============================ */
INSERT INTO lista_comentario (id_lista, id_usuario, texto_comentario) VALUES
(1, 2, 'Buena selección de libros'),
(1, 3, 'Me encanta LOTR'),
(2, 1, 'Fundación es un clásico'),
(3, 4, 'It da mucho miedo');

-- Respuesta a un comentario
INSERT INTO lista_comentario (id_lista, id_usuario, texto_comentario, id_com_respuesta) VALUES
(1, 1, 'Gracias!', 1);

/* ============================
   RELACIÓN G: LISTA-USUARIO
   ============================ */
INSERT INTO lista_usuario VALUES
(1, 2, 5),
(1, 3, 4),
(2, 1, 3),
(3, 4, 5),
(4, 1, 4);

/* ============================
   EVENTOS
   ============================ */
INSERT INTO evento (id_usuario, nombre_evento, fecha_evento, hora_evento, direccion_evento, descripcion_evento) VALUES
(1, 'Club de lectura Enero', '2025-01-15', '18:00:00', 'Calle Mayor 10', 'Debate sobre libros clásicos'),
(2, 'Reunión Sci-Fi', '2025-02-20', '19:30:00', 'Av. Futuro 22', 'Charla sobre ciencia ficción'),
(3, 'Noche de Terror', '2025-10-31', '21:00:00', 'Casa del Miedo', 'Lectura de relatos de terror');

/* ============================
   RELACIÓN H: EVENTO-USUARIO
   ============================ */
INSERT INTO evento_usuario VALUES
(1, 1, 5, 1),   -- asiste
(1, 2, 4, 2),   -- quizás
(1, 3, NULL, NULL), -- sin respuesta
(2, 1, 5, 1),
(2, 4, 3, 0),
(3, 3, 4, 1);

/* ============================
   RELACIÓN I: EVENTO-COMENTARIO
   ============================ */
INSERT INTO evento_comentario (id_evento, id_usuario, texto_comentario) VALUES
(1, 2, 'Tengo muchas ganas de este evento'),
(1, 3, 'Yo también asistiré'),
(2, 1, 'Fundación es un gran tema para debatir');

-- respuesta
INSERT INTO evento_comentario (id_evento, id_usuario, texto_comentario, id_com_respuesta) VALUES
(1, 1, 'Perfecto, nos vemos allí', 2);

/* ============================
   RELACIÓN J: EVENTO-CONTENIDO
   ============================ */
INSERT INTO evento_contenido VALUES
(1, 1, TRUE),  -- LOTR libro principal
(1, 4, FALSE),
(2, 2, TRUE),  -- Fundación libro principal
(3, 3, TRUE);  -- It libro principal
