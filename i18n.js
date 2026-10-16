/* =============================================
   I18N.JS — Rotaract Igualada
   Commuta el text entre català (per defecte, el
   text ja present a l'HTML), castellà (diccionari
   ES_MAP clavat per data-en) i anglès (data-en).
   La preferència es desa a localStorage i es manté
   en navegar entre pàgines.
   ============================================= */

(function () {
  'use strict';

  var STORAGE_KEY = 'rotaract-lang';
  var LANGS = ['ca', 'en', 'es'];

  /* Diccionari castellà: clau = text en anglès (data-en) */
  var ES_MAP = {
    'I want information': 'Quiero información',
    'Questions and proposals': 'Dudas y propuestas',
    'I want to join': 'Quiero unirme',
    'For questions, proposals or anything else. We reply within 48 hours. Fields marked with * are required.': 'Para dudas, propuestas o cualquier otra cosa. Te responderemos en menos de 48 horas. Los campos con * son obligatorios.',
    'If you are 18 to 30 and want to be part of Rotaract Igualada, tell us about yourself. We reply within 48 hours. Fields marked with * are required.': 'Si tienes entre 18 y 30 años y quieres formar parte del Rotaract Igualada, cuéntanos quién eres. Te responderemos en menos de 48 horas. Los campos con * son obligatorios.',
    'Who are you writing to?': '¿A quién escribes?',
    '✉️ General': '✉️ General',
    '👤 Presidency': '👤 Presidencia',
    '🤝 Secretary': '🤝 Secretaría',
    '0 / 1000 characters': '0 / 1000 caracteres',
    'Age': 'Edad',
    'Why do you want to join the club?': '¿Por qué quieres formar parte del club?',
    'Send request': 'Enviar solicitud',
    'Become a member': 'Hazte socio o socia',
    'Write to us from this page and we\'ll explain the process.': 'Escríbenos desde esta página y te explicaremos el proceso.',
    'Join us': 'Únete',
    'If you are 18 to 30 and want to do things for your community, we\'re waiting for you. No experience needed: just the will to contribute, learn and meet people.': 'Si tienes entre 18 y 30 años y ganas de hacer cosas por tu comunidad, te estamos esperando. No hace falta experiencia: solo ganas de aportar, aprender y conocer gente.',
    'We reply within 48 hours': 'Respondemos en menos de 48 horas',
    'All contact channels': 'Todos los canales de contacto',
    'Come to two meetings to meet the members and see how we work.': 'Ven a dos reuniones para conocer a los socios y ver cómo funcionamos.',
    'Members vote and we reply by email within 48 hours.': 'Los socios votan y te respondemos por correo en menos de 48 horas.',
    'View on Instagram': 'Ver en Instagram',
    'Want to join the club?': '¿Quieres formar parte del club?',
    'Copy': 'Copiar',
    '(optional)': '(opcional)',
    '© 2026 Rotaract Club Igualada. All rights reserved.': '© 2026 Rotaract Club Igualada. Todos los derechos reservados.',
    '✅ Message sent successfully! We\'ll reply soon.': '✅ ¡Mensaje enviado con éxito! Te responderemos pronto.',
    '✨ I want to join': '✨ Quiero unirme',
    '0 / 500 characters': '0 / 500 caracteres',
    '1. Data controller': '1. Responsable del tratamiento',
    '1. Organisation details': '1. Datos de la organización',
    '2. Purpose': '2. Finalidad',
    '2. What data we collect': '2. Qué datos recogemos',
    '2. Who uses the cookies on this website': '2. Quién utiliza las cookies en esta web',
    '2026–2027 term': 'Mandato 2026-2027',
    '3. Purpose of processing': '3. Finalidad del tratamiento',
    '3. Terms of use': '3. Condiciones de uso',
    '4. Intellectual and industrial property': '4. Propiedad intelectual e industrial',
    '4. Legal basis': '4. Base jurídica',
    '5. Data retention': '5. Conservación de los datos',
    '5. Donations and collaborations': '5. Donativos y colaboraciones',
    '6. Data disclosure to third parties': '6. Cesión de datos a terceros',
    '6. Liability': '6. Responsabilidad',
    '7. Third-party links': '7. Enlaces a terceros',
    '7. Users\' rights': '7. Derechos de los usuarios',
    '8. Data security': '8. Seguridad de los datos',
    '8. Modifications': '8. Modificaciones',
    '9. Applicable law': '9. Legislación aplicable',
    '9. Changes to the privacy policy': '9. Cambios en la política de privacidad',
    'A collection of the moments we\'ve shared together. Every activity is a step on the path we\'re building.': 'Una recopilación de los momentos que hemos compartido. Cada actividad es un paso en el camino que estamos construyendo.',
    'A cultural activity that brought together many club members. An evening to enjoy local culture and build bonds among participants.': 'Una actividad cultural que reunió a muchos miembros del club. Una velada para disfrutar de la cultura local y crear vínculos entre los participantes.',
    'A cultural excursion to get to know our region better. Guided visit, discovering local heritage and unforgettable moments together.': 'Una excursión cultural para conocer mejor nuestra comarca. Visita guiada, descubriendo el patrimonio local y momentos inolvidables juntos.',
    'A friendly team': 'Un equipo cercano',
    'A solidarity project with community impact. One of the activities of the year that generated the most response and participation from members.': 'Un proyecto solidario con impacto comunitario. Una de las actividades del año con más respuesta y participación de los miembros.',
    'A sports day among club members. An afternoon of friendly competition, teamwork and great spirits on the field.': 'Una jornada deportiva entre miembros del club. Una tarde de competición amistosa, trabajo en equipo y buen ambiente en el campo.',
    'A training session for club members. Practical content, open discussion and shared learning in a dynamic setting.': 'Una sesión formativa para los miembros del club. Contenido práctico, debate abierto y aprendizaje compartido en un entorno dinámico.',
    'A young, international network': 'Una red joven e internacional',
    'About us': 'Nosotros',
    'Access the form': 'Acceder al formulario',
    'After the meetings, members will conduct an anonymous vote to decide on your admission.': 'Tras las reuniones, los socios realizarán una votación anónima para decidir tu incorporación.',
    'Application review': 'Revisión de la solicitud',
    'Club meetings': 'Reuniones de socios',
    'When we have activities, we will post photos here!': '¡Cuando tengamos actividades, subiremos fotos aquí!',
    'No photos yet, but we will post some very soon!': '¡Todavía no tenemos fotos, pero muy pronto subiremos!',
    'Access to this website is free of charge and its use implies full acceptance of the terms of use set out here. Users agree to make appropriate use of the content and services offered by Rotaract Club Igualada through its website, and not to use them for unlawful purposes or purposes contrary to the organisation\'s values.': 'El acceso a este sitio web es gratuito y su uso implica la plena aceptación de las condiciones de uso aquí expuestas. Los usuarios se comprometen a hacer un uso adecuado de los contenidos y servicios que ofrece Rotaract Club Igualada a través de su web, y a no utilizarlos con fines ilícitos o contrarios a los valores de la organización.',
    'Accept': 'Aceptar',
    'Reject': 'Rechazar',
    'Activities': 'Actividades',
    'Activity': 'Actividad',
    'Activity Name': 'Nombre de la actividad',
    'All': 'Todas',
    'All content on the website, including text, images, logos, icons and graphic design, is the property of Rotaract Club Igualada or third parties who have authorised its use, and is protected by intellectual and industrial property laws. Reproduction is not permitted without express authorisation, except for non-commercial dissemination of our activity, always citing the source.': 'Todo el contenido de la web, incluidos textos, imágenes, logotipos, iconos y diseño gráfico, es propiedad de Rotaract Club Igualada o de terceros que han autorizado su uso, y está protegido por las leyes de propiedad intelectual e industrial. No se permite su reproducción sin autorización expresa, salvo la difusión no comercial de nuestra actividad, citando siempre la fuente.',
    'All fields marked with * are required.': 'Todos los campos marcados con * son obligatorios.',
    'All our news and activities, updated in real time.': 'Todas nuestras novedades y actividades, actualizadas en tiempo real.',
    'Allow the integration of social media content (such as embedded Instagram posts) and may be used by these platforms for their own purposes.': 'Permitir la integración de contenido de redes sociales (como publicaciones incrustadas de Instagram) y pueden ser utilizadas por estas plataformas con fines propios.',
    'Already done': 'Ya realizadas',
    'Board': 'Junta directiva',
    'Board 26-27': 'Junta 26-27',
    'Bonds, friendship and networking to grow together and gain strength.': 'Vínculos, amistad y networking para crecer juntos y ganar fuerza.',
    'Calendar': 'Calendario',
    'Check when and where our upcoming activities are. Add the dates to your calendar and don\'t miss a thing.': 'Consulta cuándo y dónde son nuestras próximas actividades. Añade las fechas a tu calendario y no te pierdas nada.',
    'Click the button and the registration form will open right here on the page.': 'Haz clic en el botón y el formulario de inscripción se abrirá aquí mismo en la página.',
    'Coming soon': 'Próximamente',
    'Committed people who are an active part of Rotaract Club Igualada, driving service and leadership in our community.': 'Personas comprometidas que forman parte activa del Club Rotaract de Igualada e impulsan el servicio y el liderazgo en nuestra comunidad.',
    'Community': 'Comunidad',
    'Completed': 'Realizada',
    'Contact': 'Contacto',
    'Contact channels': 'Canales de contacto',
    'core values': 'valores fundamentales',
    'Culture': 'Cultura',
    'Data will be kept for as long as necessary to handle the request and, subsequently, for the periods legally established for addressing possible liabilities.': 'Los datos se conservarán durante el tiempo necesario para atender la solicitud y, posteriormente, durante los plazos establecidos legalmente para afrontar posibles responsabilidades.',
    'Depends on the provider': 'Depende del proveedor',
    'Develop leadership skills': 'Desarrollar habilidades de liderazgo',
    'Discover everything we do: from solidarity projects to leisure gatherings. Every activity is a chance to grow, connect and make an impact.': 'Descubre todo lo que hacemos: desde proyectos solidarios hasta encuentros de ocio. Cada actividad es una oportunidad para crecer, conectar y generar impacto.',
    'Do I have to pay a membership fee?': '¿Tengo que pagar una cuota de socio?',
    'Data submitted through the forms is processed by the organisation\'s own channels: messages are received by email and a copy is kept on the website\'s server as proof of receipt. Apart from this, Rotaract Club Igualada does not disclose or sell personal data to third parties, except where there is a legal obligation.': 'Los datos enviados a través de los formularios se tramitan por los canales propios de la entidad: los mensajes se reciben por correo electrónico y se conserva una copia en el servidor de la web como resguardo de recepción. Aparte de esto, Rotaract Club Igualada no cede ni vende datos personales a terceros, salvo que exista una obligación legal.',
    'Email': 'Correo electrónico',
    'Embrace cultural diversity and gain a global outlook': 'Abrazar la diversidad cultural y adquirir una visión global',
    'Events this month': 'Actos de este mes',
    'Follow us on Instagram': 'Síguenos en Instagram',
    'Fr': 'Vi',
    'Frequently asked questions': 'Preguntas frecuentes',
    'Full name': 'Nombre completo',
    'Gallery': 'Galería',
    'This website does not use cookies. While you browse it, anonymous visit statistics are collected with GoatCounter, which stores nothing on your device and does not keep your IP address. The only thing saved in your browser is the language you choose, which contains no personal data and never leaves your device.': 'Este sitio web no utiliza cookies. Al navegar por él se recogen estadísticas anónimas de visitas con GoatCounter, que no guarda nada en tu dispositivo ni la dirección IP. Lo único que se guarda en tu navegador es el idioma que eliges, que no contiene datos personales y nunca sale de tu dispositivo.',
    'The map on the «About us» page is only loaded if you ask for it: your browser then downloads the map images from OpenStreetMap. Links to Instagram take you to its website, which has its own policies.': 'El mapa de la página «Nosotros» solo se carga si lo pides: entonces el navegador descarga las imágenes del mapa de OpenStreetMap. Los enlaces a Instagram te llevan a su web, que tiene sus propias políticas.',
    // Instagram (portada)
    'Projects': 'Proyectos',
    'Team': 'Equipo',
    'Quiz': 'Test',
    'Follow': 'Síguenos',
    'posts': 'publicaciones',
    'followers': 'seguidores',
    'Young people who act, connect and lead. Volunteering, projects and friendship in Anoia.': 'Jóvenes que actúan, conectan y lideran. Voluntariado, proyectos y amistad en el Anoia.',
    '18 to 30 years old': 'De 18 a 30 años',
    'District 2202': 'Distrito 2202',
    'Scan it with your phone': 'Escanéalo con el móvil',
    'Download the QR': 'Descarga el QR',
    'Highlights': 'Destacadas',
    'See all our posts on Instagram': 'Ver todas las publicaciones en Instagram',
    'Our moments': 'Nuestros momentos',
    'Club presentation': 'Presentación del club',
    '24 September 2026': '24 de septiembre de 2026',
    'Dinner': 'Cena',
    'On Thursday 24 September we officially presented Rotaract Club Igualada at Ses Oliveres, in front of Rotary Igualada: we received our Rotary International certificate and the club bell. Then we shared the dinner talk and, to round off the evening, we held a bingo with everyone there.': 'El jueves 24 de septiembre presentamos oficialmente el Club Rotaract de Igualada en Ses Oliveres, ante Rotary Igualada: recibimos el certificado de Rotary International y la campana del club. A continuación compartimos la cena coloquio y, para terminar la noche, hicimos un bingo con todos los asistentes.',
    'Club presentation at the Rotary Igualada dinner talk': 'Presentación del club en la cena coloquio de Rotary Igualada',
    'Presentation': 'Presentación',
    'See the photos': 'Ver las fotos',
    'Home | Rotaract Club of Igualada': 'Inicio | Club Rotaract de Igualada',
    'About us | Rotaract Club of Igualada': 'Nosotros | Club Rotaract de Igualada',
    'Activities | Rotaract Club of Igualada': 'Actividades | Club Rotaract de Igualada',
    'Board | Rotaract Club of Igualada': 'Junta directiva | Club Rotaract de Igualada',
    'Contact | Rotaract Club of Igualada': 'Contacto | Club Rotaract de Igualada',
    'District 2202 contact': 'Contacto del Distrito 2202',
    'What is Rotaract?': '¿Qué es Rotaract?',
    'Young people who act, connect and lead': 'Jóvenes que actúan, conectan y lideran',
    'Rotaract is an international network of young people who want to make a positive impact on their community, develop leadership skills and be part of an active, committed community. At Rotaract Club Igualada, young people aged 18 to 30, we bring this spirit to our city and the Anoia region.': 'Rotaract es una red internacional de jóvenes que quieren generar un impacto positivo en su entorno, desarrollar habilidades de liderazgo y formar parte de una comunidad activa y comprometida. En el Club Rotaract de Igualada, jóvenes de entre 18 y 30 años, llevamos este espíritu a nuestra ciudad y a la comarca del Anoia.',
    'Come and discover who we are, what we do and how you can take part. No previous experience needed: just the will to contribute, learn and meet people who share your interests.': 'Ven a descubrir quiénes somos, qué hacemos y cómo puedes participar. No necesitas experiencia previa: solo ganas de aportar, aprender y conocer gente con las mismas inquietudes que tú.',
    'In District 2202, Rotaract clubs connect young people from different cities to drive service, volunteering, training, friendship and cooperation projects with Rotary.': 'En el Distrito 2202, los clubes Rotaract conectan a jóvenes de distintas ciudades para impulsar proyectos de servicio, voluntariado, formación, amistad y cooperación con Rotary.',
    'age range': 'rango de edad',
    'Rotaract is an international network of young people who want to make a positive impact on their community, develop leadership skills and be part of an active, committed community. Promoted by Rotary International, it has more than 10,000 clubs in over 170 countries.': 'Rotaract es una red internacional de jóvenes que quieren generar un impacto positivo en su entorno, desarrollar habilidades de liderazgo y formar parte de una comunidad activa y comprometida. Impulsada por Rotary International, cuenta con más de 10.000 clubes en más de 170 países.',
    'Our club belongs to District 2202, which brings together the Rotary and Rotaract clubs of Cantabria, Navarre, the Basque Country, La Rioja, Aragon and Catalonia. In the district, Rotaract clubs connect young people from different cities to drive service, volunteering, training, friendship and cooperation projects with Rotary.': 'Nuestro club pertenece al Distrito 2202, que agrupa los clubes Rotary y Rotaract de Cantabria, Navarra, Euskadi (País Vasco), La Rioja, Aragón y Cataluña. En el distrito, los clubes Rotaract conectan a jóvenes de distintas ciudades para impulsar proyectos de servicio, voluntariado, formación, amistad y cooperación con Rotary.',
    'We drive service, volunteering, training and friendship projects in cooperation with Rotary Igualada, sharing its values of service, friendship and integrity.': 'Impulsamos proyectos de servicio, voluntariado, formación y amistad en cooperación con Rotary Igualada, con quien compartimos los valores de servicio, amistad e integridad.',
    'Young people aged 18 to 30 eager to take part in social and community service projects. No previous experience needed.': 'Jóvenes de entre 18 y 30 años con ganas de participar en proyectos sociales y de servicio a la comunidad. No hace falta experiencia previa.',
    'The whole Rotary family, all together': 'La familia rotaria, todos juntos',
    'Presentation of the Rotary International certificate': 'Entrega del certificado de Rotary International',
    'Presenting the club bell': 'Entrega de la campana del club',
    'The Rotaract Igualada team': 'El equipo de Rotaract Igualada',
    'A dinner to remember': 'Una cena para recordar',
    'General': 'General',
    'Get in touch': 'Ponte en contacto',
    'Get to know Rotaract Igualada, our Rotary family, and the international movement we\'re part of.': 'Conoce Rotaract Igualada, nuestra familia Rotary y el movimiento internacional del que formamos parte.',
    'Igualada is the capital of the Anoia region, in the centre of Catalonia and about 60 km from Barcelona. It is our club\'s home town, and from here we run projects for the whole region.': 'Igualada es la capital de la comarca del Anoia, en el centro de Cataluña y a unos 60 km de Barcelona. Es la ciudad de nuestro club, y desde aquí hacemos proyectos para toda la comarca.',
    'Towns': 'Municipios',
    'Search for any town in Anoia or tap it on the map to see where it is and how far it is from Igualada. The pink numbers show the club\'s activities in each place.': 'Busca cualquier municipio del Anoia o tócalo en el mapa para ver dónde está y a qué distancia queda de Igualada. Los números rosa son las actividades del club en cada lugar.',
    'Club activities': 'Actividades del club',
    'Done': 'Hechas',
    'Next one': 'La próxima',
    'See them on the map': 'Verlas en el mapa',
    // Test «Quin voluntari ets?» (portada)
    '1-minute test': 'Test de 1 minuto',
    'What kind of volunteer are you?': '¿Qué voluntario eres?',
    'Five quick questions to discover your profile and which club activities suit you best.': 'Cinco preguntas rápidas para descubrir tu perfil y qué actividades del club te van más.',
    '5 questions · 1 minute · 5 possible profiles': '5 preguntas · 1 minuto · 5 perfiles posibles',
    'Start the test': 'Empieza el test',
    'Your answers stay in your browser: nothing is sent or saved.': 'Las respuestas se quedan en tu navegador: no se envía ni se guarda nada.',
    'Back': 'Atrás',
    'A perfect Saturday starts…': 'Un sábado perfecto empieza…',
    'With a hike in nature': 'Con una excursión por la naturaleza',
    'Lending a hand to someone who needs it': 'Echando una mano a quien lo necesita',
    'Going for a run or doing sport': 'Saliendo a correr o haciendo deporte',
    'Having breakfast with my grandparents': 'Desayunando con los abuelos',
    'Organising plans for the whole group': 'Organizando el plan de todo el grupo',
    'What would get you off the sofa?': '¿Qué te haría saltar del sofá?',
    'Knowing that some families can\'t make ends meet': 'Saber que hay familias que no llegan a final de mes',
    'A good idea that nobody gets round to organising': 'Una buena idea que nadie se pone a organizar',
    'Seeing plastic in the Anoia river': 'Ver plásticos en el río Anoia',
    'An elderly person who feels lonely': 'Una persona mayor que se siente sola',
    'Nobody knowing what to do if someone\'s heart stops': 'Que nadie sepa qué hacer ante una parada cardíaca',
    'In your group of friends, you\'re the one who…': 'En tu grupo, tú eres quien…',
    'Brings everyone together, young and old': 'Hace de puente entre todos, pequeños y mayores',
    'Makes sure everyone is OK': 'Se asegura de que todos estén bien',
    'Gets everyone excited and has a thousand ideas': 'Anima a todo el mundo y tiene mil ideas',
    'Listens and is always there when needed': 'Escucha y siempre está cuando hace falta',
    'Recycles and reminds everyone not to waste anything': 'Recicla y recuerda que no tiremos nada',
    'You have €500 to improve Igualada. What do you do?': 'Tienes 500 € para mejorar Igualada. ¿Qué haces?',
    'Defibrillators and first-aid courses': 'Desfibriladores y cursos de primeros auxilios',
    'New trees and a river clean-up': 'Árboles nuevos y una limpieza del río',
    'A charity party that gets the whole town moving': 'Una fiesta solidaria que mueva a toda la ciudad',
    'Workshops where young and old learn together': 'Talleres donde jóvenes y mayores aprendan juntos',
    'Food parcels for families in need': 'Lotes de comida para las familias que lo necesitan',
    'Which superpower would you choose?': '¿Qué superpoder elegirías?',
    'Endless energy': 'Energía infinita',
    'Knowing what anyone needs just by looking at them': 'Saber qué necesita cada uno con solo mirarle',
    'Making plants grow wherever I touch': 'Hacer crecer plantas allá donde toco',
    'Travelling in time to hear stories from the past': 'Viajar en el tiempo para escuchar historias de antes',
    'Healing any wound': 'Curar cualquier herida',
    'Your profile': 'Tu perfil',
    'Green spirit': 'Espíritu verde',
    'You care about the planet and you show it. You\'re the ideal person for river clean-ups, tree planting and anything that makes Anoia a little greener.': 'Te mueve el planeta y lo demuestras con hechos. Eres la persona ideal para limpiezas del río, plantadas de árboles y todo lo que haga el Anoia un poco más verde.',
    'Big heart': 'Corazón solidario',
    'When someone is having a hard time, you\'re the first to lend a hand. Food drives, charity stalls and projects with social organisations are where you belong.': 'Cuando alguien lo pasa mal, eres quien primero echa una mano. Recogidas de alimentos, puestos solidarios y proyectos con entidades sociales son tu sitio.',
    'Healthy energy': 'Energía saludable',
    'Sport, health and wellbeing are in your DNA. Charity runs, first-aid workshops and blood donation drives have your name on them.': 'Deporte, salud y bienestar: lo llevas dentro. Carreras solidarias, talleres de primeros auxilios y campañas de donación de sangre llevan tu nombre.',
    'Bridge between generations': 'Puente entre generaciones',
    'You love bringing people of all ages together. Workshops with older people, activities with children and projects where everyone learns from everyone.': 'Te encanta conectar a personas de todas las edades. Talleres con gente mayor, actividades con niños y proyectos donde todos aprenden de todos.',
    'Team engine': 'Motor del equipo',
    'You have ideas, energy and the drive to make them happen. Organising events, getting people on board and making things happen is your superpower.': 'Tienes ideas, energía y ganas de hacerlas realidad. Organizar eventos, animar a la gente y hacer que las cosas pasen es tu superpoder.',
    'Your mix': 'Tu mezcla',
    'Club activities for you': 'Actividades del club para ti',
    'We don\'t have an activity like this on the calendar yet… maybe you\'ll be the one to suggest it!': 'Todavía no tenemos ninguna actividad de este tipo en el calendario… ¡quizá la propongas tú!',
    'See all activities': 'Ver todas las actividades',
    'Take the test again': 'Repite el test',
    'Search for a town in Anoia': 'Busca un municipio del Anoia',
    'Search': 'Buscar',
    'All of Anoia': 'Todo el Anoia',
    'Full screen': 'Pantalla completa',
    'Igualada': 'Igualada',
    'Where we are': 'Dónde estamos',
    'Region': 'Comarca',
    'Province': 'Provincia',
    'View the interactive map': 'Ver el mapa interactivo',
    'It loads from OpenStreetMap when you open it.': 'Al abrirlo se carga desde OpenStreetMap.',
    'Got a question or a proposal?': '¿Tienes una duda o una propuesta?',
    'Got a question, a proposal, or want to collaborate? We\'re here.': '¿Tienes una duda, una propuesta o quieres colaborar? Estamos aquí.',
    'Have an idea, want to collaborate, or just want to know more about Rotaract Club Igualada? Write to us and we\'ll reply within 48 hours.': '¿Tienes una idea, quieres colaborar o simplemente saber más sobre Rotaract Club Igualada? Escríbenos y te responderemos en 48 horas.',
    'Home': 'Inicio',
    'How can I propose projects or collaborations?': '¿Cómo puedo proponer proyectos o colaboraciones?',
    'How to join the club': 'Cómo unirse al club',
    'In compliance with current legislation, users are informed that this website is owned by [Association/Foundation name], a non-profit organisation registered in the [corresponding Register] under number [Registration number], with Tax ID [Entity Tax ID] and registered office at [Address].': 'En cumplimiento de la legislación vigente, se informa a los usuarios de que este sitio web es propiedad de [Nombre de la asociación/fundación], entidad sin ánimo de lucro inscrita en el [Registro correspondiente] con el número [Número de registro], NIF [NIF de la entidad] y domicilio social en [Dirección].',
    'Informing about Rotaract Club Igualada\'s activities and projects, when consent for communications has been given.': 'Informar sobre las actividades y proyectos de Rotaract Club Igualada, cuando se haya dado el consentimiento para las comunicaciones.',
    'Instagram': 'Instagram',
    'Its pillars of action include promoting peace, fighting disease, access to clean water, maternal and child health, supporting education and growing local economies.': 'Sus pilares de acción incluyen promover la paz, luchar contra las enfermedades, el acceso al agua potable, la salud materno-infantil, apoyar la educación y hacer crecer las economías locales.',
    'JOIN ROTARACT': 'ÚNETE A ROTARACT',
    'Join the club': 'Inscríbete al club',
    'Join the club (Sign-up form) →': 'Inscríbete al club (Formulario de alta) →',
    'legal notice': 'aviso legal',
    'Legal Notice': 'Aviso Legal',
    'Legal notice': 'Aviso legal',
    'JOIN US': 'ÚNETE',
    'July 2026': 'Julio 2026',
    'Leadership': 'Liderazgo',
    'Legal': 'Legal',
    'Legal notice': 'Aviso legal',
    'Link to the sign-up form': 'Enlace al formulario de alta',
    'Managing the relationship with members, volunteers and collaborators.': 'Gestionar la relación con socios, voluntarios y colaboradores.',
    'Members': 'Socios',
    'Message': 'Mensaje',
    'Message sent successfully!': '¡Mensaje enviado con éxito!',
    'Mo': 'Lu',
    'Moments we\'ve shared together throughout our journey.': 'Momentos que hemos compartido a lo largo de nuestro recorrido.',
    'Name': 'Nombre',
    'Navigation': 'Navegación',
    'Our': 'Nuestros',
    'Our club': 'Nuestro club',
    'Partnership': 'Colaboración',
    'Past': 'Pasadas',
    'Past activities': 'Actividades pasadas',
    'Personal approach': 'Trato cercano',
    'Personal growth and leadership': 'Crecimiento personal y liderazgo',
    'Personal growth, shared responsibility and youth initiative.': 'Crecimiento personal, responsabilidad compartida e iniciativa juvenil.',
    'Phone': 'Teléfono',
    'Plan ahead': 'Planifica con antelación',
    'Preferences': 'Preferencias',
    'Presidency': 'Presidencia',
    'President': 'Presidente',
    'privacy policy': 'política de privacidad',
    'Privacy Policy': 'Política de Privacidad',
    'Privacy policy': 'Política de privacidad',
    'Projects designed to respond to real needs with direct impact.': 'Proyectos diseñados para responder a necesidades reales con impacto directo.',
    'Remember options to offer you a better experience (language, display settings, etc.).': 'Recordar opciones para ofrecerte una mejor experiencia (idioma, ajustes de visualización, etc.).',
    'Reply within 48h': 'Respuesta en 48h',
    'Responding to enquiries, collaboration or volunteering requests.': 'Responder a consultas, solicitudes de colaboración o voluntariado.',
    'Rotaract Club Igualada': 'Rotaract Club Igualada',
    'Rotaract Club Igualada adopts the necessary technical and organisational measures to ensure the security of personal data and prevent its alteration, loss, unauthorised processing or access.': 'Rotaract Club Igualada adopta las medidas técnicas y organizativas necesarias para garantizar la seguridad de los datos personales y evitar su alteración, pérdida, tratamiento o acceso no autorizados.',
    'This website does not process payments or collect online donations. Any economic collaboration with the organisation is managed through the direct contact channels indicated on this website.': 'Este sitio web no procesa pagos ni recoge donativos en línea. Cualquier colaboración económica con la entidad se gestiona a través de los canales de contacto directos que se indican en esta web.',
    'Rotaract Club Igualada is not responsible for any security errors that may occur, nor for any damage that may be caused to a user\'s computer system due to the presence of viruses or any other element that may cause alterations to the computer system.': 'Rotaract Club Igualada no se hace responsable de los errores de seguridad que puedan producirse ni de los daños que puedan causarse en el sistema informático del usuario por la presencia de virus o cualquier otro elemento que pueda provocar alteraciones en el sistema.',
    'Rotaract Club Igualada reserves the right to make any modifications it deems appropriate to its website, and may change, remove or add content and services provided through it, as well as the way they are presented or located.': 'Rotaract Club Igualada se reserva el derecho de realizar las modificaciones que considere oportunas en su sitio web, pudiendo cambiar, suprimir o añadir tanto los contenidos y servicios prestados a través del mismo como la forma en la que se presentan o localizan.',
    'Rotaract Club Igualada was born from the will of a group of young people from the Anoia region to put their talent and energy at the service of the community. We are active members of the global Rotaract network and work to create a real impact in our community.': 'Rotaract Club Igualada nace de la voluntad de un grupo de jóvenes de la comarca de la Anoia de poner su talento y energía al servicio de la comunidad. Somos miembros activos de la red global Rotaract y trabajamos para crear un impacto real en nuestra comunidad.',
    'ROTARACT CLUB OF IGUALADA': 'ROTARACT CLUB DE IGUALADA',
    'Rotaract International & District': 'Rotaract Internacional y Distrito',
    'Rotary Club Igualada is our Rotaract club\'s parent club. Made up of professionals and business people from the Anoia region, it has worked for decades on local and international projects to improve people\'s lives.': 'El Rotary Club Igualada es el club padrino de nuestro club Rotaract. Formado por profesionales y empresarios de la comarca de la Anoia, lleva décadas trabajando en proyectos locales e internacionales para mejorar la vida de las personas.',
    'Rotary International': 'Rotary International',
    'Rotary International is a worldwide organisation of civic and business leaders dedicated to providing humanitarian aid, promoting peace and improving international understanding. Founded in 1905, it brings together more than 1.4 million members in 46,000 clubs around the world.': 'Rotary International es una organización mundial de líderes cívicos y empresariales dedicados a prestar ayuda humanitaria, promover la paz y mejorar el entendimiento internacional. Fundada en 1905, reúne a más de 1,4 millones de socios en 46.000 clubes de todo el mundo.',
    'Sa': 'Sá',
    'Secretary': 'Secretario/a',
    'See activities': 'Ver actividades',
    'Select a day to see the details.': 'Selecciona un día para ver los detalles.',
    'Send message': 'Enviar mensaje',
    'Send us a message': 'Envíanos un mensaje',
    'Send us a message through this form or by email and we\'ll explain the process.': 'Envíanos un mensaje a través de este formulario o por correo y te explicaremos el proceso.',
    'Service': 'Servicio',
    'Service, friendship and leadership': 'Servicio, amistad y liderazgo',
    'Session / up to 1 year': 'Sesión / hasta 1 año',
    'Sign up for the activities we have planned. Reserve your spot and be part of our next adventure.': 'Inscríbete en las actividades que tenemos preparadas. Reserva tu plaza y sé parte de nuestra próxima aventura.',
    'Sign-up form': 'Formulario de alta',
    'Skip to main content': 'Saltar al contenido principal',
    'Social media': 'Redes sociales',
    'Social Media': 'Redes sociales',
    'Social projects with real impact': 'Proyectos sociales con impacto real',
    'Solidarity': 'Solidarias',
    'Sports': 'Deportivas',
    'Su': 'Do',
    'Subject': 'Asunto',
    'Summary of the past activity. How many people took part, what the impact was and the highlights of the day.': 'Resumen de la actividad pasada. Cuánta gente participó, cuál fue el impacto y lo más destacado del día.',
    'Surname': 'Apellidos',
    'Take action through community and international service': 'Actuar a través del servicio comunitario e internacional',
    'Take part in professional development': 'Participar en el desarrollo profesional',
    'Talk to us': 'Háblanos',
    'Th': 'Ju',
    'The': 'Los',
    'The data provided is used for the following purposes:': 'Los datos facilitados se utilizan para las siguientes finalidades:',
    'The people who make the club possible: our members and the board steering our course from 2026 to 2027.': 'Las personas que hacen posible el club: nuestros socios y la junta que dirige nuestro rumbo de 2026 a 2027.',
    'The processing of data is based on the user\'s consent, given by submitting the form and accepting this privacy policy.': 'El tratamiento de los datos se basa en el consentimiento del usuario, otorgado al enviar el formulario y aceptar esta política de privacidad.',
    'The team leading Rotaract Igualada during the 2026-2027 term, with commitment, service and youth leadership.': 'El equipo que lidera Rotaract Igualada durante el mandato 2026-2027, con compromiso, servicio y liderazgo juvenil.',
    'Their work inspires and supports our activity as Rotaract, sharing values of service, friendship and integrity.': 'Su trabajo inspira y apoya nuestra actividad como Rotaract, compartiendo los valores de servicio, amistad e integridad.',
    'These terms shall be governed by current Spanish law, with both parties submitting, for any dispute, to the courts corresponding to the organisation\'s registered office.': 'Estas condiciones se regirán por la legislación española vigente, sometiéndose ambas partes, para cualquier controversia, a los juzgados y tribunales correspondientes al domicilio social de la organización.',
    'This legal notice governs the use of the website rotaractigualada.org, made available by Rotaract Club Igualada to inform users about its activity, mission, projects and possible ways to collaborate.': 'El presente aviso legal regula el uso del sitio web rotaractigualada.org, puesto a disposición por Rotaract Club Igualada para informar a los usuarios sobre su actividad, misión, proyectos y posibles vías de colaboración.',
    'This privacy policy may be modified to adapt it to legislative or case-law developments. In such cases, changes will be announced with sufficient notice on this same website.': 'Esta política de privacidad puede ser modificada para adaptarla a novedades legislativas o jurisprudenciales. En esos casos, los cambios se anunciarán con la antelación suficiente en este mismo sitio web.',
    'This website includes embedded Instagram content. These services may install their own cookies on your device when you visit the website, in accordance with their own privacy policies, over which Rotaract Club Igualada has no control.': 'Este sitio web incluye contenido incrustado de Instagram. Estos servicios pueden instalar sus propias cookies en tu dispositivo cuando visitas la web, de acuerdo con sus propias políticas de privacidad, sobre las que Rotaract Club Igualada no tiene ningún control.',
    'This website may contain links to third-party websites (partners, funding organisations, social media, etc.). Rotaract Club Igualada is not responsible for the content or privacy policies of these external sites.': 'Este sitio web puede contener enlaces a sitios web de terceros (colaboradores, organizaciones financiadoras, redes sociales, etc.). Rotaract Club Igualada no se hace responsable del contenido ni de las políticas de privacidad de estos sitios externos.',
    'Through the contact forms («I want information» and «I want to join») we collect your name, surname, email address, age, phone number (optional), the reason and the content of your message. This data is used solely to manage your request and respond to you.': 'A través de los formularios de contacto («Quiero información» y «Quiero unirme») recogemos tu nombre, apellidos, correo electrónico, edad, teléfono (opcional), el motivo y el contenido del mensaje. Estos datos se utilizan únicamente para gestionar tu solicitud y responderte.',
    'For security and to prevent spam, the IP address from which the form is sent is also stored, on the basis of the legitimate interest in protecting the website. It is not shared with anyone and is only used to detect abusive submissions.': 'Por seguridad y para evitar el spam, también se guarda la dirección IP desde la que se envía el formulario, sobre la base del interés legítimo de proteger el sitio web. No se comparte con nadie y solo se utiliza para detectar envíos abusivos.',
    'Training': 'Formación',
    'Treasurer': 'Tesorero/a',
    'Tu': 'Ma',
    'Type': 'Tipo',
    'united team': 'equipo unido',
    'Up to 1 year': 'Hasta 1 año',
    'Upcoming': 'Próximas',
    'Upcoming activities': 'Próximas actividades',
    'Visit rotary.org →': 'Visitar rotary.org →',
    'Fill in the form': 'Rellena el formulario',
    'Fill in the form and we\'ll get back to you soon.': 'Rellena el formulario y nos pondremos en contacto contigo muy pronto.',
    'Final vote': 'Votación final',
    'Ready to get started?': '¿Ya tienes ganas de empezar?',
    'Response within 48 hours': 'Respuesta en 48 horas',
    'Visit rotaryigualada.org →': 'Visitar rotaryigualada.org →',
    'Visit the Rotaract information →': 'Visitar la información de Rotaract →',
    'Want to be part of Rotaract?': '¿Quieres formar parte de Rotaract?',
    'Want to be part of Rotaract Igualada? The process is simple and transparent.': '¿Quieres formar parte del Rotaract Igualada? El proceso es sencillo y transparente.',
    'We': 'Mi',
    'We are a community of committed young people driving social and leadership projects in the Anoia region. As part of the global Rotary network, we turn our energy into community service and real action.': 'Somos una comunidad de jóvenes comprometidos que impulsamos proyectos sociales y de liderazgo en la comarca de la Anoia. Como parte de la red global de Rotary, transformamos nuestra energía en servicio comunitario y acción real.',
    'We are a community of committed young people driving social and leadership projects in the Anoia region. As part of the global Rotary network, we turn our energy into community service and real action. We bring together talent, friendship and values to create a positive impact and grow together.': 'Somos una comunidad de jóvenes comprometidos que impulsamos proyectos sociales y de liderazgo en la comarca de la Anoia. Como parte de la red global de Rotary, transformamos nuestra energía en servicio comunitario y acción real. Unimos talento, amistad y valores para generar un impacto positivo en nuestro entorno y crecer juntos.',
    'We don\'t have any activities scheduled yet, but we\'re already working on what\'s coming next. They\'ll be posted here very soon!': 'Todavía no tenemos actividades programadas, pero ya estamos trabajando en lo que viene. ¡Las publicaremos aquí muy pronto!',
    'We haven\'t confirmed any dates yet, but we\'re already working on the next activities. Check back soon!': 'Todavía no hemos confirmado fechas, pero ya estamos trabajando en las próximas actividades. ¡Vuelve pronto!',
    'We\'ll reply within 48 hours. Thank you for contacting Rotaract Igualada.': 'Te responderemos en un plazo de 48 horas. Gracias por contactar con Rotaract Igualada.',
    'We\'re just getting started': 'Acabamos de empezar',
    'We\'re preparing our next activities': 'Estamos preparando nuestras próximas actividades',
    'We\'re still setting up the calendar': 'Todavía estamos configurando el calendario',
    'We will get back to you as soon as possible.': 'Te responderemos lo antes posible.',
    'Whether it\'s to collaborate, propose a project, ask a question, or simply get to know us better — all enquiries are welcome. We\'re a close-knit team and we reply quickly.': 'Ya sea para colaborar, proponer un proyecto, hacer una pregunta o simplemente conocernos mejor: todas las consultas son bienvenidas. Somos un equipo cercano y respondemos rápido.',
    'Who can join Rotaract Igualada?': '¿Quién puede unirse a Rotaract Igualada?',
    'Who we are': 'Quiénes somos',
    'Write to sign up': 'Escríbenos para apuntarte',
    'Write to us': 'Escríbenos',
    'Writing to:': 'Escribiendo a:',
    'Yes, there is an annual fee. Contact us to find out the current details.': 'Sí, existe una cuota anual. Contacta con nosotros para conocer las condiciones actuales.',
    'You can reach us by email or through our social media. We reply within 48h.': 'Puedes contactar con nosotros por correo o a través de nuestras redes sociales. Respondemos en un plazo de 48h.',
    'Tell us who you are, what your values are, and why you want to be part of the club.': 'Cuéntanos quién eres, cuáles son tus valores y por qué quieres formar parte del club.',
    'The club team will review your application to better understand your profile and motivations.': 'El equipo del club revisará tu solicitud para conocer mejor tu perfil y tus motivaciones.',
    'You will attend two club meetings to meet the members, see how we work, and decide if you\'re a good fit.': 'Asistirás a dos reuniones del club para conocer a los socios, ver cómo trabajamos y decidir si encajas con nosotros.',
    'You will be notified by email within 48 hours with the result of the vote. Whether it\'s a yes or a not yet, we\'ll be by your side to guide your next steps.': 'Te notificaremos por correo en menos de 48 horas el resultado de la votación. Sea un sí o un "todavía no", estaremos a tu lado para guiar tus próximos pasos.',
    '💬 Something else': '💬 Otras cuestiones',
    '❓ A question': '❓ Una duda',
    '💡 A proposal': '💡 Una propuesta',
    'Use this form for questions, proposals or anything else. All fields marked with * are required.': 'Usa este formulario para dudas, propuestas o cualquier otra cuestión. Todos los campos marcados con * son obligatorios.',
  };

  /* Diccionari castellà per a elements amb contingut HTML (data-en-is-html) */
  var ES_MAP_HTML = {
    'We\'re here<br><em>for you</em>': 'Estamos aquí<br><em>para ti</em>',
    'I have read and accept the <a href="#" class="open-avis-legal">legal notice</a> and the <a href="#" class="open-politica-privacitat">privacy policy</a>.': 'He leído y acepto el <a href="#" class="open-avis-legal">aviso legal</a> y la <a href="#" class="open-politica-privacitat">política de privacidad</a>.',
    'In accordance with the General Data Protection Regulation (GDPR) and applicable Spanish law, you can exercise your rights of access, rectification, erasure, objection, restriction of processing and data portability by emailing <strong>rotaractigualada@gmail.com</strong>, stating which right you wish to exercise and attaching a copy of a document proving your identity.': 'De acuerdo con el Reglamento General de Protección de Datos (RGPD) y la normativa española vigente, puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad de los datos escribiendo a <strong>rotaractigualada@gmail.com</strong>, indicando el derecho que deseas ejercer y adjuntando una copia de un documento que acredite tu identidad.',
    'The data controller for personal data collected through this website is Rotaract Club Igualada, a non-profit organisation registered in the [corresponding Association/Foundation Register] under number [Registration number], with Tax ID [Entity Tax ID] and registered office at [Address]. You can contact the organisation by email at <strong>rotaractigualada@gmail.com</strong>.': 'El responsable del tratamiento de los datos personales recogidos a través de este sitio web es Rotaract Club Igualada, entidad sin ánimo de lucro inscrita en el [Registro de Asociaciones/Fundaciones correspondiente] con el número [Número de registro], NIF [NIF de la entidad] y domicilio social en [Dirección]. Puedes contactar con la organización por correo electrónico en <strong>rotaractigualada@gmail.com</strong>.',
    'Young people who act, connect and lead. <br>At Rotaract Igualada we bring together the talent and energy of young people aged 18 to 30 to create solidarity projects with a real impact on our community.': 'Jóvenes que actúan, conectan y lideran. <br>En Rotaract Igualada unimos el talento y la energía de jóvenes de entre 18 y 30 años para crear proyectos solidarios con un impacto real en nuestro entorno.'
  };

  /* Placeholders de formularis */
  var ES_MAP_PH = {
    'Search for a town in Anoia…': 'Busca un municipio del Anoia…',
    'Tell us who you are, what you like and what you would like to do in the club...': 'Cuéntanos quién eres, qué te gusta y qué te gustaría hacer en el club...',
    'Tell us what you need...': 'Cuéntanos qué necesitas...',
    'Write your message here...': 'Escribe tu mensaje aquí...',
    'you@email.com': 'tu@email.com',
    'Your full name': 'Tu nombre completo',
    'Your name': 'Tu nombre',
    'Your surname': 'Tus apellidos'
  };

  var LANG_NAMES = { ca: 'català', en: 'English', es: 'castellà' };
  var LANG_OPT_LABELS = {
    ca: { ca: 'Català', en: 'Anglès', es: 'Castellà' },
    en: { ca: 'Catalan', en: 'English', es: 'Spanish' },
    es: { ca: 'Catalán', en: 'Inglés', es: 'Español' }
  };
  var MENU_BTN_LABEL = {
    ca: 'Canvia d\'idioma (actual: ',
    en: 'Change language (current: ',
    es: 'Cambiar idioma (actual: '
  };
  var MENU_LIST_LABEL = { ca: 'Idioma', en: 'Language', es: 'Idioma' };

  /* Idioma de la pàgina: cada versió té el seu fitxer (arrel = català,
     /es/ = castellà, /en/ = anglès) i el declara a <html lang>. */
  function pageLang() {
    var lang = (document.documentElement.getAttribute('lang') || 'ca').toLowerCase();
    return LANGS.indexOf(lang) !== -1 ? lang : 'ca';
  }

  /* Adreça de la mateixa pàgina en un altre idioma */
  function urlFor(lang) {
    var file = window.location.pathname.split('/').pop() || '';
    if (file === 'index.html') file = '';
    var prefix = lang === 'ca' ? '/' : '/' + lang + '/';
    return prefix + file + window.location.search + window.location.hash;
  }

  function saveLang(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) { /* localStorage no disponible: no passa res greu */ }
  }

  /* Tradueix el contingut de la pàgina. També la fa servir
     scripts/build-idiomes.mjs per generar les versions /es/ i /en/. */
  function translateDom(lang) {
    var elements = document.querySelectorAll('[data-en]');

    elements.forEach(function (el) {
      var isHtml = el.hasAttribute('data-en-is-html');
      if (isHtml) {
        // Nota de seguretat: data-en-is-html només s'usa amb contingut fix
        // i de confiança del propi codi, mai amb entrada de l'usuari.
        if (!el.hasAttribute('data-ca-html')) {
          el.setAttribute('data-ca-html', el.innerHTML);
        }
        if (lang === 'en') {
          el.innerHTML = el.getAttribute('data-en');
        } else if (lang === 'es') {
          el.innerHTML = ES_MAP_HTML[el.getAttribute('data-en')] || el.getAttribute('data-en');
        } else {
          el.innerHTML = el.getAttribute('data-ca-html');
        }
        return;
      }
      // La primera vegada, desem el text original en català
      // dins data-ca perquè es pugui recuperar sempre.
      if (!el.hasAttribute('data-ca')) {
        el.setAttribute('data-ca', el.textContent);
      }
      if (lang === 'en') {
        el.textContent = el.getAttribute('data-en');
      } else if (lang === 'es') {
        el.textContent = ES_MAP[el.getAttribute('data-en')] || el.getAttribute('data-en');
      } else {
        el.textContent = el.getAttribute('data-ca');
      }
    });

    // Placeholders de formularis
    document.querySelectorAll('[data-en-placeholder]').forEach(function (el) {
      if (!el.hasAttribute('data-ca-placeholder')) {
        el.setAttribute('data-ca-placeholder', el.getAttribute('placeholder') || '');
      }
      if (lang === 'en') {
        el.setAttribute('placeholder', el.getAttribute('data-en-placeholder'));
      } else if (lang === 'es') {
        el.setAttribute('placeholder', ES_MAP_PH[el.getAttribute('data-en-placeholder')] || el.getAttribute('data-en-placeholder'));
      } else {
        el.setAttribute('placeholder', el.getAttribute('data-ca-placeholder'));
      }
    });

    document.documentElement.setAttribute('lang', lang);
  }

  function applyLang(lang) {
    translateDom(lang);

    document.querySelectorAll('.lang-menu__btn').forEach(function (btn) {
      btn.setAttribute('aria-label', MENU_BTN_LABEL[lang] + LANG_NAMES[lang] + ')');
      btn.setAttribute('aria-expanded', 'false');
    });
    document.querySelectorAll('.lang-menu__list').forEach(function (list) {
      list.setAttribute('aria-label', MENU_LIST_LABEL[lang]);
    });
    document.querySelectorAll('[data-lang-current]').forEach(function (el) {
      el.textContent = lang.toUpperCase();
    });
    document.querySelectorAll('[data-lang-opt]').forEach(function (opt) {
      var labels = LANG_OPT_LABELS[lang];
      if (labels) opt.textContent = labels[opt.dataset.langOpt] || opt.textContent;
      opt.classList.toggle('lang-menu__opt--active', opt.dataset.langOpt === lang);
    });
    closeLangMenus();

    // Notifica la resta de scripts (p. ex. el calendari d'activitats)
    // que generen text dinàmic, perquè es repintin en l'idioma nou.
    document.dispatchEvent(new CustomEvent('rotaract:lang', { detail: { lang: lang } }));
  }

  window.RotaractI18n = { translateDom: translateDom };

  function openLangMenu(menu) {
    document.querySelectorAll('.lang-menu.is-open').forEach(function (other) {
      if (other !== menu) {
        other.classList.remove('is-open');
        var b = other.querySelector('.lang-menu__btn');
        if (b) b.setAttribute('aria-expanded', 'false');
      }
    });
    menu.classList.add('is-open');
    var btn = menu.querySelector('.lang-menu__btn');
    if (btn) btn.setAttribute('aria-expanded', 'true');
  }

  function closeLangMenus() {
    document.querySelectorAll('.lang-menu.is-open').forEach(function (menu) {
      menu.classList.remove('is-open');
      var btn = menu.querySelector('.lang-menu__btn');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    applyLang(pageLang());

    document.querySelectorAll('.lang-menu').forEach(function (menu) {
      var btn = menu.querySelector('.lang-menu__btn');
      var list = menu.querySelector('.lang-menu__list');
      if (!btn || !list) return;

      btn.addEventListener('click', function (event) {
        event.stopPropagation();
        if (menu.classList.contains('is-open')) {
          closeLangMenus();
        } else {
          openLangMenu(menu);
        }
      });

      list.addEventListener('click', function (event) {
        var opt = event.target.closest ? event.target.closest('[data-lang-opt]') : null;
        if (!opt) return;
        closeLangMenus();
        var lang = opt.dataset.langOpt;
        // La tria es desa i es porta el visitant a la mateixa pàgina
        // en l'idioma triat (p. ex. /nosaltres.html → /en/nosaltres.html)
        saveLang(lang);
        if (lang !== pageLang()) window.location.href = urlFor(lang);
      });
    });

    document.addEventListener('click', function () {
      closeLangMenus();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeLangMenus();
    });
  });
})();