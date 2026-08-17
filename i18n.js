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
    '(optional)': '(opcional)',
    '© 2026 Rotaract Club Igualada. All rights reserved.': '© 2026 Rotaract Club Igualada. Todos los derechos reservados.',
    '✅ Message sent successfully! We\'ll reply soon.': '✅ ¡Mensaje enviado con éxito! Te responderemos pronto.',
    '✨ I want to join': '✨ Quiero unirme',
    '0 / 500 characters': '0 / 500 caracteres',
    '1. Data controller': '1. Responsable del tratamiento',
    '1. Organisation details': '1. Datos de la organización',
    '1. What are cookies': '1. Qué son las cookies',
    '2. Purpose': '2. Finalidad',
    '2. What data we collect': '2. Qué datos recogemos',
    '2. Who uses the cookies on this website': '2. Quién utiliza las cookies en esta web',
    '2. Does this website use cookies?': '2. ¿Este sitio web utiliza cookies?',
    '2026–2027 term': 'Mandato 2026-2027',
    '3. Purpose of processing': '3. Finalidad del tratamiento',
    '3. Terms of use': '3. Condiciones de uso',
    '3. Types of cookies we use': '3. Tipos de cookies que utilizamos',
    '4. Intellectual and industrial property': '4. Propiedad intelectual e industrial',
    '4. Legal basis': '4. Base jurídica',
    '4. Third-party cookies': '4. Cookies de terceros',
    '5. Data retention': '5. Conservación de los datos',
    '5. Donations and collaborations': '5. Donativos y colaboraciones',
    '5. How to manage or disable cookies': '5. Cómo gestionar o desactivar las cookies',
    '6. Changes to the cookie policy': '6. Cambios en la política de cookies',
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
    'Access to this website is free of charge and its use implies full acceptance of the terms of use set out here. Users agree to make appropriate use of the content and services offered by Rotaract Club Igualada through its website, and not to use them for unlawful purposes or purposes contrary to the organisation\'s values.': 'El acceso a este sitio web es gratuito y su uso implica la plena aceptación de las condiciones de uso aquí expuestas. Los usuarios se comprometen a hacer un uso adecuado de los contenidos y servicios que ofrece Rotaract Club Igualada a través de su web, y a no utilizarlos con fines ilícitos o contrarios a los valores de la organización.',
    'Accept': 'Aceptar',
    'Reject': 'Rechazar',
    'This website only uses technical storage to remember your language. If you accept, we use Google analytics cookies to understand how the website is used.': 'Este sitio web solo utiliza almacenamiento técnico para recordar tu idioma. Si aceptas, usamos cookies de análisis de Google para entender cómo se utiliza la web.',
    'Activities': 'Actividades',
    'Activity': 'Actividad',
    'Activity Name': 'Nombre de la actividad',
    'age range': 'rango de edad',
    'All': 'Todas',
    'All content on the website, including text, images, logos, icons and graphic design, is the property of Rotaract Club Igualada or third parties who have authorised its use, and is protected by intellectual and industrial property laws. Reproduction is not permitted without express authorisation, except for non-commercial dissemination of our activity, always citing the source.': 'Todo el contenido de la web, incluidos textos, imágenes, logotipos, iconos y diseño gráfico, es propiedad de Rotaract Club Igualada o de terceros que han autorizado su uso, y está protegido por las leyes de propiedad intelectual e industrial. No se permite su reproducción sin autorización expresa, salvo la difusión no comercial de nuestra actividad, citando siempre la fuente.',
    'All fields marked with * are required.': 'Todos los campos marcados con * son obligatorios.',
    'All our news and activities, updated in real time.': 'Todas nuestras novedades y actividades, actualizadas en tiempo real.',
    'Allow browsing of the website and use of its basic features (for example, remembering that you have closed a notice).': 'Permitir la navegación por la web y el uso de sus funciones básicas (por ejemplo, recordar que has cerrado un aviso).',
    'Allow browsing of the website and use of its basic features (for example, remembering your language preference).': 'Permitir la navegación por la web y el uso de sus funciones básicas (por ejemplo, recordar tu preferencia de idioma).',
    'Allow the integration of social media content (such as embedded Instagram posts) and may be used by these platforms for their own purposes.': 'Permitir la integración de contenido de redes sociales (como publicaciones incrustadas de Instagram) y pueden ser utilizadas por estas plataformas con fines propios.',
    'Allow us to understand how users interact with the website in order to improve its performance and content.': 'Permitirnos entender cómo interactúan los usuarios con la web para mejorar su rendimiento y contenido.',
    'Allow us to understand how users interact with the website in order to improve its performance and content. Only installed if you accept them.': 'Permitirnos entender cómo interactúan los usuarios con la web para mejorar su rendimiento y contenido. Solo se instalan si las aceptas.',
    'Already done': 'Ya realizadas',
    'Analytics / statistics': 'Analítica / estadísticas',
    'At Rotaract Club Igualada we are a community of young people eager to do useful, meaningful, close-to-home work. We work as a team to drive social, cultural and service initiatives that bring real value to the city and our community.': 'En Rotaract Club Igualada somos una comunidad de jóvenes con ganas de hacer un trabajo útil, significativo y cercano. Trabajamos en equipo para impulsar iniciativas sociales, culturales y de servicio que aportan valor real a la ciudad y a nuestra comunidad.',
    'Board': 'Junta directiva',
    'Board 26-27': 'Junta 26-27',
    'Bonds, friendship and networking to grow together and gain strength.': 'Vínculos, amistad y networking para crecer juntos y ganar fuerza.',
    'Calendar': 'Calendario',
    'Check when and where our upcoming activities are. Add the dates to your calendar and don\'t miss a thing.': 'Consulta cuándo y dónde son nuestras próximas actividades. Añade las fechas a tu calendario y no te pierdas nada.',
    'Coming soon': 'Próximamente',
    'Committed people who are an active part of Rotaract Club Igualada, driving service and leadership in our community.': 'Personas comprometidas que forman parte activa del Club Rotaract de Igualada e impulsan el servicio y el liderazgo en nuestra comunidad.',
    'Community': 'Comunidad',
    'Completed': 'Realizadas',
    'Contact': 'Contacto',
    'Contact channels': 'Canales de contacto',
    'Cookie policy': 'Política de cookies',
    'Cookies are small text files that websites store on your device (computer, mobile or tablet) when you visit them. Among other things, they help remember your preferences, improve your browsing experience, and gather usage statistics for the website.': 'Las cookies son pequeños archivos de texto que los sitios web guardan en tu dispositivo (ordenador, móvil o tableta) cuando los visitas. Entre otras cosas, ayudan a recordar tus preferencias, mejorar tu experiencia de navegación y recopilar estadísticas de uso del sitio web.',
    'core values': 'valores fundamentales',
    'Culture': 'Cultura',
    'Data will be kept for as long as necessary to handle the request and, subsequently, for the periods legally established for addressing possible liabilities.': 'Los datos se conservarán durante el tiempo necesario para atender la solicitud y, posteriormente, durante los plazos establecidos legalmente para afrontar posibles responsabilidades.',
    'Depends on the provider': 'Depende del proveedor',
    'Develop leadership skills': 'Desarrollar habilidades de liderazgo',
    'Discover everything we do: from solidarity projects to leisure gatherings. Every activity is a chance to grow, connect and make an impact.': 'Descubre todo lo que hacemos: desde proyectos solidarios hasta encuentros de ocio. Cada actividad es una oportunidad para crecer, conectar y generar impacto.',
    'Do I have to pay a membership fee?': '¿Tengo que pagar una cuota de socio?',
    'Data submitted through the contact form is processed directly by the organisation\'s own channels: messages are received by email and a copy is kept on the website\'s server as proof of receipt. Rotaract Club Igualada does not disclose or sell personal data to third parties, except where there is a legal obligation.': 'Los datos enviados a través del formulario de contacto se tramitan directamente por los canales propios de la entidad: los mensajes se reciben por correo electrónico y se conserva una copia en el servidor de la web como resguardo de recepción. Aparte de esto, Rotaract Club Igualada no cede ni vende datos personales a terceros, salvo que exista una obligación legal.',
    'Duration': 'Duración',
    'Email': 'Correo electrónico',
    'Embrace cultural diversity and gain a global outlook': 'Abrazar la diversidad cultural y adquirir una visión global',
    'Events this month': 'Actos de este mes',
    'Follow us on Instagram': 'Síguenos en Instagram',
    'Fr': 'Vi',
    'Frequently asked questions': 'Preguntas frecuentes',
    'Full name': 'Nombre completo',
    'Gallery': 'Galería',
    'General': 'General',
    'general email': 'correo general',
    'Get in touch': 'Ponte en contacto',
    'Get to know Rotaract Igualada, our Rotary family, and the international movement we\'re part of.': 'Conoce Rotaract Igualada, nuestra familia Rotary y el movimiento internacional del que formamos parte.',
    'Google Analytics (GA4) is installed by Google LLC / Google Ireland Limited as our measurement provider. It only acts when you have accepted analytics cookies. In addition, if we embed posts from our Instagram profile, Instagram may install its own cookies; those platforms have their own privacy and cookie policies, over which we have no control.': 'Google Analytics (GA4) es instalado por Google LLC / Google Ireland Limited como nuestro proveedor de medición. Solo actúa si has aceptado las cookies de análisis. Además, si incrustamos publicaciones de nuestro perfil de Instagram, Instagram puede instalar sus propias cookies; esas plataformas tienen sus propias políticas de privacidad y de cookies, sobre las que no tenemos ningún control.',
    'Google Chrome': 'Google Chrome',
    'Got a question or a proposal?': '¿Tienes una duda o una propuesta?',
    'Got a question, a proposal, or want to collaborate? We\'re here.': '¿Tienes una duda, una propuesta o quieres colaborar? Estamos aquí.',
    'Have an idea, want to collaborate, or just want to know more about Rotaract Club Igualada? Write to us and we\'ll reply within 48 hours.': '¿Tienes una idea, quieres colaborar o simplemente saber más sobre Rotaract Club Igualada? Escríbenos y te responderemos en 48 horas.',
    'Home': 'Inicio',
    'How can I propose projects or collaborations?': '¿Cómo puedo proponer proyectos o colaboraciones?',
    'If you\'re between 18 and 30 and want to do useful things with energetic people, you\'re in the right place.': 'Si tienes entre 18 y 30 años y quieres hacer cosas útiles con gente con energía, estás en el sitio adecuado.',
    'In compliance with current legislation, users are informed that this website is owned by [Association/Foundation name], a non-profit organisation registered in the [corresponding Register] under number [Registration number], with Tax ID [Entity Tax ID] and registered office at [Address].': 'En cumplimiento de la legislación vigente, se informa a los usuarios de que este sitio web es propiedad de [Nombre de la asociación/fundación], entidad sin ánimo de lucro inscrita en el [Registro correspondiente] con el número [Número de registro], NIF [NIF de la entidad] y domicilio social en [Dirección].',
    'Information collected through cookies is managed by Rotaract Club Igualada and, in cases where third-party services are used (such as social media or analytics tools), also by the providers of those services.': 'La información recogida mediante cookies es gestionada por Rotaract Club Igualada y, en los casos en que se utilizan servicios de terceros (como redes sociales o herramientas de analítica), también por los proveedores de dichos servicios.',
    'Informing about Rotaract Club Igualada\'s activities and projects, when consent for communications has been given.': 'Informar sobre las actividades y proyectos de Rotaract Club Igualada, cuando se haya dado el consentimiento para las comunicaciones.',
    'Instagram': 'Instagram',
    'Its pillars of action include promoting peace, fighting disease, access to clean water, maternal and child health, supporting education and growing local economies.': 'Sus pilares de acción incluyen promover la paz, luchar contra las enfermedades, el acceso al agua potable, la salud materno-infantil, apoyar la educación y hacer crecer las economías locales.',
    'JOIN ROTARACT': 'ÚNETE A ROTARACT',
    'Join the club (Sign-up form) →': 'Inscríbete al club (Formulario de alta) →',
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
    'Microsoft Edge': 'Microsoft Edge',
    'Mo': 'Lu',
    'Moments we\'ve shared together throughout our journey.': 'Momentos que hemos compartido a lo largo de nuestro recorrido.',
    'Mozilla Firefox': 'Mozilla Firefox',
    'Name': 'Nombre',
    'Navigation': 'Navegación',
    'Our': 'Nuestros',
    'Our activities combine community service, professional development and building friendships among young people committed to Rotary\'s values.': 'Nuestras actividades combinan servicio comunitario, desarrollo profesional y construcción de amistades entre jóvenes comprometidos con los valores de Rotary.',
    'Our club': 'Nuestro club',
    'Our club belongs to District 2202, which brings together the Rotary and Rotaract clubs of Catalonia and the Balearic Islands. The district organises meetings, training sessions and joint projects throughout the year.': 'Nuestro club pertenece al Distrito 2202, que reúne los clubes Rotary y Rotaract de Cataluña y las Islas Baleares. El distrito organiza encuentros, formaciones y proyectos conjuntos durante todo el año.',
    'Partnership': 'Colaboración',
    'Past': 'Pasadas',
    'Past activities': 'Actividades pasadas',
    'Personal approach': 'Trato cercano',
    'Personal growth and leadership': 'Crecimiento personal y liderazgo',
    'Personal growth, shared responsibility and youth initiative.': 'Crecimiento personal, responsabilidad compartida e iniciativa juvenil.',
    'Phone': 'Teléfono',
    'Plan ahead': 'Planifica con antelación',
    'Please note that if you disable cookies, some features of the website may not work correctly.': 'Ten en cuenta que si desactivas las cookies, algunas funciones de la web pueden no funcionar correctamente.',
    'Preferences': 'Preferencias',
    'Presidency': 'Presidencia',
    'President': 'Presidente',
    'president\'s email': 'correo del presidente',
    'Privacy policy': 'Política de privacidad',
    'Projects designed to respond to real needs with direct impact.': 'Proyectos diseñados para responder a necesidades reales con impacto directo.',
    'Purpose': 'Finalidad',
    'Remember options to offer you a better experience (language, display settings, etc.).': 'Recordar opciones para ofrecerte una mejor experiencia (idioma, ajustes de visualización, etc.).',
    'Reply within 48h': 'Respuesta en 48h',
    'Responding to enquiries, collaboration or volunteering requests.': 'Responder a consultas, solicitudes de colaboración o voluntariado.',
    'Rotaract Club Igualada': 'Rotaract Club Igualada',
    'Rotaract Club Igualada adopts the necessary technical and organisational measures to ensure the security of personal data and prevent its alteration, loss, unauthorised processing or access.': 'Rotaract Club Igualada adopta las medidas técnicas y organizativas necesarias para garantizar la seguridad de los datos personales y evitar su alteración, pérdida, tratamiento o acceso no autorizados.',
    'This website does not process payments or collect online donations. Any economic collaboration with the organisation is managed through the direct contact channels indicated on this website.': 'Este sitio web no procesa pagos ni recoge donativos en línea. Cualquier colaboración económica con la entidad se gestiona a través de los canales de contacto directos que se indican en esta web.',
    'Rotaract Club Igualada is not responsible for any security errors that may occur, nor for any damage that may be caused to a user\'s computer system due to the presence of viruses or any other element that may cause alterations to the computer system.': 'Rotaract Club Igualada no se hace responsable de los errores de seguridad que puedan producirse ni de los daños que puedan causarse en el sistema informático del usuario por la presencia de virus o cualquier otro elemento que pueda provocar alteraciones en el sistema.',
    'Rotaract Club Igualada may modify this cookie policy to adapt it to legislative or technical developments. It is recommended to review it periodically.': 'Rotaract Club Igualada puede modificar esta política de cookies para adaptarla a novedades legislativas o técnicas. Se recomienda revisarla periódicamente.',
    'Rotaract Club Igualada reserves the right to make any modifications it deems appropriate to its website, and may change, remove or add content and services provided through it, as well as the way they are presented or located.': 'Rotaract Club Igualada se reserva el derecho de realizar las modificaciones que considere oportunas en su sitio web, pudiendo cambiar, suprimir o añadir tanto los contenidos y servicios prestados a través del mismo como la forma en la que se presentan o localizan.',
    'Rotaract Club Igualada was born from the will of a group of young people from the Anoia region to put their talent and energy at the service of the community. We are active members of the global Rotaract network and work to create a real impact in our community.': 'Rotaract Club Igualada nace de la voluntad de un grupo de jóvenes de la comarca de la Anoia de poner su talento y energía al servicio de la comunidad. Somos miembros activos de la red global Rotaract y trabajamos para crear un impacto real en nuestra comunidad.',
    'ROTARACT CLUB OF IGUALADA': 'ROTARACT CLUB DE IGUALADA',
    'Rotaract International & District': 'Rotaract Internacional y Distrito',
    'Rotaract is Rotary International\'s programme for young people aged 18 to 30. With more than 10,000 clubs in over 170 countries, it is one of the largest youth service movements in the world.': 'Rotaract es el programa de Rotary International para jóvenes de 18 a 30 años. Con más de 10.000 clubes en más de 170 países, es uno de los mayores movimientos juveniles de servicio del mundo.',
    'Rotary Club Igualada is our Rotaract club\'s parent club. Made up of professionals and business people from the Anoia region, it has worked for decades on local and international projects to improve people\'s lives.': 'El Rotary Club Igualada es el club padrino de nuestro club Rotaract. Formado por profesionales y empresarios de la comarca de la Anoia, lleva décadas trabajando en proyectos locales e internacionales para mejorar la vida de las personas.',
    'Rotary International': 'Rotary International',
    'Rotary International is a worldwide organisation of civic and business leaders dedicated to providing humanitarian aid, promoting peace and improving international understanding. Founded in 1905, it brings together more than 1.4 million members in 46,000 clubs around the world.': 'Rotary International es una organización mundial de líderes cívicos y empresariales dedicados a prestar ayuda humanitaria, promover la paz y mejorar el entendimiento internacional. Fundada en 1905, reúne a más de 1,4 millones de socios en 46.000 clubes de todo el mundo.',
    'Sa': 'Sá',
    'Safari': 'Safari',
    'Secretary': 'Secretario/a',
    'secretary\'s email': 'correo del secretario',
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
    'Technical and necessary': 'Técnicas y necesarias',
    'Th': 'Ju',
    'The': 'Los',
    'The data provided is used for the following purposes:': 'Los datos facilitados se utilizan para las siguientes finalidades:',
    'The people who make the club possible: our members and the board steering our course from 2026 to 2027.': 'Las personas que hacen posible el club: nuestros socios y la junta que dirige nuestro rumbo de 2026 a 2027.',
    'The processing of data is based on the user\'s consent, given by submitting the contact form and accepting this privacy policy.': 'El tratamiento de los datos se basa en el consentimiento del usuario, otorgado al enviar el formulario de contacto y aceptar esta política de privacidad.',
    'The team leading Rotaract Igualada during the 2026-2027 term, with commitment, service and youth leadership.': 'El equipo que lidera Rotaract Igualada durante el mandato 2026-2027, con compromiso, servicio y liderazgo juvenil.',
    'Their work inspires and supports our activity as Rotaract, sharing values of service, friendship and integrity.': 'Su trabajo inspira y apoya nuestra actividad como Rotaract, compartiendo los valores de servicio, amistad e integridad.',
    'These terms shall be governed by current Spanish law, with both parties submitting, for any dispute, to the courts corresponding to the organisation\'s registered office.': 'Estas condiciones se regirán por la legislación española vigente, sometiéndose ambas partes, para cualquier controversia, a los juzgados y tribunales correspondientes al domicilio social de la organización.',
    'This legal notice governs the use of the website rotaractigualada.org, made available by Rotaract Club Igualada to inform users about its activity, mission, projects and possible ways to collaborate.': 'El presente aviso legal regula el uso del sitio web rotaractigualada.org, puesto a disposición por Rotaract Club Igualada para informar a los usuarios sobre su actividad, misión, proyectos y posibles vías de colaboración.',
    'This privacy policy may be modified to adapt it to legislative or case-law developments. In such cases, changes will be announced with sufficient notice on this same website.': 'Esta política de privacidad puede ser modificada para adaptarla a novedades legislativas o jurisprudenciales. En esos casos, los cambios se anunciarán con la antelación suficiente en este mismo sitio web.',
    'This website includes embedded Instagram content. These services may install their own cookies on your device when you visit the website, in accordance with their own privacy policies, over which Rotaract Club Igualada has no control.': 'Este sitio web incluye contenido incrustado de Instagram. Estos servicios pueden instalar sus propias cookies en tu dispositivo cuando visitas la web, de acuerdo con sus propias políticas de privacidad, sobre las que Rotaract Club Igualada no tiene ningún control.',
    'This website may contain links to third-party websites (partners, funding organisations, social media, etc.). Rotaract Club Igualada is not responsible for the content or privacy policies of these external sites.': 'Este sitio web puede contener enlaces a sitios web de terceros (colaboradores, organizaciones financiadoras, redes sociales, etc.). Rotaract Club Igualada no se hace responsable del contenido ni de las políticas de privacidad de estos sitios externos.',
    'This website only uses strictly necessary local storage (localStorage) to remember your language preference — data that never leaves your device. Additionally, if you give your consent, Google Analytics (GA4) analytics cookies are installed to understand how the website is used. Without your consent, no cookies are installed and no measurement service is loaded.': 'Este sitio web solo utiliza almacenamiento local estrictamente necesario (localStorage) para recordar tu preferencia de idioma, un dato que nunca sale de tu dispositivo. Además, si das tu consentimiento, se instalan cookies de análisis de Google Analytics (GA4) para entender cómo se utiliza la web. Sin tu consentimiento no se instala ninguna cookie ni se carga ningún servicio de medición.',
    'This website only uses technical storage to remember your language. If you accept, we use Google analytics cookies to understand how the website is used.': 'Este sitio web solo utiliza almacenamiento técnico para recordar tu idioma. Si aceptas, usamos cookies de análisis de Google para entender cómo se utiliza la web.',
    'Through the contact form we collect your name, email address, selected subject and the content of the message you send us. This data is used solely to manage your request and respond to you.': 'A través del formulario de contacto recogemos tu nombre, correo electrónico, el asunto seleccionado y el contenido del mensaje que nos envías. Estos datos se utilizan únicamente para gestionar tu solicitud y responderte.',
    'Training': 'Formación',
    'Treasurer': 'Tesorero/a',
    'Tu': 'Ma',
    'Type': 'Tipo',
    'united team': 'equipo unido',
    'Up to 1 year': 'Hasta 1 año',
    'Up to 2 years': 'Hasta 2 años',
    'Upcoming': 'Próximas',
    'Upcoming activities': 'Próximas actividades',
    'Visit rotary.org →': 'Visitar rotary.org →',
    'Visit rotaryigualada.org →': 'Visitar rotaryigualada.org →',
    'Visit the Rotaract information →': 'Visitar la información de Rotaract →',
    'Want to be part of Rotaract?': '¿Quieres formar parte de Rotaract?',
    'We': 'Nosotros',
    'We are a community of committed young people driving social and leadership projects in the Anoia region. As part of the global Rotary network, we turn our energy into community service and real action.': 'Somos una comunidad de jóvenes comprometidos que impulsamos proyectos sociales y de liderazgo en la comarca de la Anoia. Como parte de la red global de Rotary, transformamos nuestra energía en servicio comunitario y acción real.',
    'We are a community of committed young people driving social and leadership projects in the Anoia region. As part of the global Rotary network, we turn our energy into community service and real action. We bring together talent, friendship and values to create a positive impact and grow together.': 'Somos una comunidad de jóvenes comprometidos que impulsamos proyectos sociales y de liderazgo en la comarca de la Anoia. Como parte de la red global de Rotary, transformamos nuestra energía en servicio comunitario y acción real. Unimos talento, amistad y valores para generar un impacto positivo en nuestro entorno y crecer juntos.',
    'We are part of an international network of young people acting with local commitment. Our way of working is clear: combine ideas, organise actions and generate impact.': 'Formamos parte de una red internacional de jóvenes que actúan con compromiso local. Nuestra forma de trabajar es clara: combinar ideas, organizar acciones y generar impacto.',
    'We don\'t have any activities scheduled yet, but we\'re already working on what\'s coming next. They\'ll be posted here very soon!': 'Todavía no tenemos actividades programadas, pero ya estamos trabajando en lo que viene. ¡Las publicaremos aquí muy pronto!',
    'We haven\'t confirmed any dates yet, but we\'re already working on the next activities. Check back soon!': 'Todavía no hemos confirmado fechas, pero ya estamos trabajando en las próximas actividades. ¡Vuelve pronto!',
    'We\'ll reply within 48 hours. Thank you for contacting Rotaract Igualada.': 'Te responderemos en un plazo de 48 horas. Gracias por contactar con Rotaract Igualada.',
    'We\'re just getting started': 'Acabamos de empezar',
    'We\'re preparing our next activities': 'Estamos preparando nuestras próximas actividades',
    'We\'re still setting up the calendar': 'Todavía estamos configurando el calendario',
    'Whether it\'s to collaborate, propose a project, ask a question, or simply get to know us better — all enquiries are welcome. We\'re a close-knit team and we reply quickly.': 'Ya sea para colaborar, proponer un proyecto, hacer una pregunta o simplemente conocernos mejor: todas las consultas son bienvenidas. Somos un equipo cercano y respondemos rápido.',
    'While the browser is open': 'Mientras el navegador está abierto',
    'Who can join Rotaract Igualada?': '¿Quién puede unirse a Rotaract Igualada?',
    'Who we are': 'Quiénes somos',
    'Write to sign up': 'Escríbenos para apuntarte',
    'Write to us': 'Escríbenos',
    'Writing to:': 'Escribiendo a:',
    'Yes, there is an annual fee. Contact us to find out the current details.': 'Sí, existe una cuota anual. Contacta con nosotros para conocer las condiciones actuales.',
    'You can allow, block or delete cookies installed on your device through your browser\'s settings. Below are links to information on managing cookies in the most common browsers:': 'Puedes permitir, bloquear o eliminar las cookies instaladas en tu dispositivo mediante la configuración de tu navegador. A continuación tienes los enlaces a la información sobre la gestión de cookies en los navegadores más habituales:',
    'You can reach us by email or through our social media. We reply within 48h.': 'Puedes contactar con nosotros por correo o a través de nuestras redes sociales. Respondemos en un plazo de 48h.',
    'Young people aged 18 to 30 eager to take part in social and community service projects.': 'Jóvenes de 18 a 30 años con ganas de participar en proyectos de servicio social y comunitario.',
    'Young people who turn ideas into action': 'Jóvenes que convierten ideas en acción',
    '💬 Other': '💬 Otro',
    '📰 Press': '📰 Prensa',
    '📸 Our activities': '📸 Nuestras actividades',
    '🙌 Volunteering': '🙌 Voluntariado',
    '🤝 Collaboration': '🤝 Colaboración'
  };

  /* Diccionari castellà per a elements amb contingut HTML (data-en-is-html) */
  var ES_MAP_HTML = {
    'We\'re here<br><em>for you</em>': 'Estamos aquí<br><em>para ti</em>',
    'I have read and accept the &lt;a href=&quot;#&quot; class=&quot;open-avis-legal&quot;&gt;legal notice&lt;/a&gt; and the &lt;a href=&quot;#&quot; class=&quot;open-politica-privacitat&quot;&gt;privacy policy&lt;/a&gt;.': 'He leído y acepto el &lt;a href=&quot;#&quot; class=&quot;open-avis-legal&quot;&gt;aviso legal&lt;/a&gt; y la &lt;a href=&quot;#&quot; class=&quot;open-politica-privacitat&quot;&gt;política de privacidad&lt;/a&gt;.',
    'In accordance with the General Data Protection Regulation (GDPR) and applicable Spanish law, you can exercise your rights of access, rectification, erasure, objection, restriction of processing and data portability by emailing &lt;a href=&quot;mailto:rotaractigualada@gmail.com&quot;&gt;rotaractigualada@gmail.com&lt;/a&gt;, stating which right you wish to exercise and attaching a copy of a document proving your identity.': 'De acuerdo con el Reglamento General de Protección de Datos (RGPD) y la normativa española vigente, puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad de los datos escribiendo a &lt;a href=&quot;mailto:rotaractigualada@gmail.com&quot;&gt;rotaractigualada@gmail.com&lt;/a&gt;, indicando el derecho que deseas ejercer y adjuntando una copia de un documento que acredite tu identidad.',
    'The data controller for personal data collected through this website is Rotaract Club Igualada, a non-profit organisation registered in the [corresponding Association/Foundation Register] under number [Registration number], with Tax ID [Entity Tax ID] and registered office at [Address]. You can contact the organisation by email at &lt;a href=&quot;mailto:rotaractigualada@gmail.com&quot;&gt;rotaractigualada@gmail.com&lt;/a&gt;.': 'El responsable del tratamiento de los datos personales recogidos a través de este sitio web es Rotaract Club Igualada, entidad sin ánimo de lucro inscrita en el [Registro de Asociaciones/Fundaciones correspondiente] con el número [Número de registro], NIF [NIF de la entidad] y domicilio social en [Dirección]. Puedes contactar con la organización por correo electrónico en &lt;a href=&quot;mailto:rotaractigualada@gmail.com&quot;&gt;rotaractigualada@gmail.com&lt;/a&gt;.',
    'We believe in the power of young people to transform our community. <br>At Rotaract Igualada we bring together the talent and energy of young people aged 18 to 30 to create solidarity projects with a real impact.': 'Creemos en el poder de la juventud para transformar nuestra comunidad. <br>En Rotaract Igualada unimos el talento y la energía de jóvenes de entre 18 y 30 años para crear proyectos solidarios con un impacto real.'
  };

  /* Placeholders de formularis */
  var ES_MAP_PH = {
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

  function getSavedLang() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY) || 'ca';
      return LANGS.indexOf(saved) !== -1 ? saved : 'ca';
    } catch (e) {
      return 'ca';
    }
  }

  function saveLang(lang) {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) { /* localStorage no disponible: no passa res greu */ }
  }

  function applyLang(lang) {
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
    document.body.classList.toggle('lang-ca', lang === 'ca');
    document.body.classList.toggle('lang-en', lang === 'en');
    document.body.classList.toggle('lang-es', lang === 'es');

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

    saveLang(lang);
  }

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
    applyLang(getSavedLang());

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
        applyLang(opt.dataset.langOpt);
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