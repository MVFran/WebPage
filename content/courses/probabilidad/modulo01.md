---
title: Probabilidad Elemental 
order: 1
---

# Probabilidad Elemental

## Experimentos Aleatorios

Existen dos tipos de fenómenos o experimentos en la naturaleza; los deterministas y los aleatorios. Un experimento determinista es aquel que produce el mismo resultado cuando se repite bajo las mismas condiciones. Un experimento aleatorio es aquel que, cuando se repite bajo las mismas condiciones, el resultado que se observa no es siempre el mismo y tampoco es predecible. 

Pediremos que los experimentos aleatorios que consideremos cumplan teóricamente las caracteristicas siguientes:
- El experimento debe poder ser repetible bajo las mismas condiciones iniciales.
- El resultado de cualquier ensayo del experimento es variable y depende del azar o de algún mecanismo aleatorio.

## Espacio Muestral

**Definición:** El espacio muestral, también llamado espacio muestra, de un experimento 
aleatorio es el conjunto de todos los posibles resultados del experimento y se denota, 
generalmente, por la letra griega $\Omega$. A un resultado partícular del experimento se le denota por la letra $\omega$.

En algunos textos se usa también la letra $S$ para denotar al espacio muestral. Proviene del término *Sampling Space*.

Llamaremos evento o suceso a cualquier subconjunto del espacio muestral. Los denotaremos por las primeras letras del alfabeto en mayúsculas: $A$, $B$, $C$, $\cdots$

**Ejemplo:** Si un experimento aleatorio consiste en lanzar un dado y observar el número que aparece en la cara superior, entonces claramente el espacio muestra es el conjunto $\Omega = \{ 1,2,3,4,5,6 \}$. Como ejemplo de un evento para este experimento, podemos definir el conjunto $A = \{ 2,4,6 \}$, que corresponde al suceso de obtener como resultado un número par. Si al lanzar el dado una vez se obtiene el número "4", decimos entonces que se observó la ocurrencia del evento $A$, y si se obtiene, por ejemplo, el resultado "1" decimos que no se observó la ocurrencia del evento $A$.

## Operaciones con Conjuntos

Se dice que $A$ es un subconjunto propio de $B$ si $A \not\subseteq B$, es decir, si $A$ está contenido en $B$ pero no es todo $B$. La igualdad de dos conjuntos $A$ y $B$ significa que se cumplen las contenciones $A \subset B$ y $B \subset A$. Por último, si $A$ es un conjunto, denotamos la cardinalidad o número de elementos de ese conjunto por el simbolo $\#A$.

Sean $A$ y $B$ dos subconjuntos cualesquiera de $\Omega$. Se tiene:
$$
A \cup B \{ \omega \in \Omega | \omega \in A \lor \omega \in B \} \\
A \cap B \{ \omega \in \Omega | \omega \in A \land \omega \in B \} \\
A - B \{ \omega \in \Omega | \omega \in A \land \omega \notin B \} \\
A^c \{ \omega \in \Omega | \omega \notin A \}
$$
Es fácil verificar que el conjunto vacio y el conjunto total satisfacen las siguientes propiedades:
$$
A \cup \varnothing = A \ \ ; \ \ A \cap \varnothing = \varnothing \ \ ; \ \ A \cup \Omega = \Omega \\
A \cap \Omega = A \ \ ; \ \ A \cup A^c = \Omega \ \ ; \ \ A \cap A^c = \varnothing
$$
Además, las operaciones de unión e intersección son asociativas:
$$
A \cup (B \cup C) = (A \cup B) \cup C \ \ ; \ \ A \cap (B \cap C) = (A \cap B) \cap C 
$$
Y también son distributivas: 
$$
A \cap (B \cup C) = (A \cap B) \cup (A \cap C) \\
A \cup (B \cap C) = (A \cup B) \cap (A \cup C)
$$
Recordemos también la operación diferencia simétrica entre dos conjuntos $A$ y $B$, denotada por $A \triangle B$:
$$
A \triangle B = (A \cup B) - (B \cap A)
$$
Recordemos además las **leyes de De Morgan**:
$$
(A \cup B)^c = A^c \cap B^c \\
(A \cap B)^c = A^c \cup B^c
$$

## Conjuntos Ajenos

Cuando dos conjuntos no tienen ningún elemento en común se dice que son ajenos, es decir, los conjuntos $A$ y $B$ son ajenos o adjuntos si se cumple la igualdad:
$$
A \cap B = \varnothing
$$
La propiedad de ser ajenos puede extenderse al caso cuando se tienen varios conjuntos. Decimos que $n$ conjuntos $A_1, \cdots, A_n$ son ajenos si $A_1 \cap \cdots \cap A_n = \varnothing$, y se dice que son ajenos dos a dos (o mutuamente ajenos) si $A_i \cap A_j = \varnothing$ para cualesquiera valores de los indices $i,j = 1,2, \cdots , n$, con $i \neq j$. La propiedad de ser ajenos dos a dos para una colección de eventos implica que los conjuntos son ajenos, sin embargo, el hecho de que todos ellos sean ajenos no implica que sean ajenos dos a dos. Es decir, la propiedad de ser ajenos dos a dos es más fuerte que la propiedad de simplemente ser ajenos. 

**Ejemplo:** Los conjuntos $A = \{ 1,2 \}$, $B = \{ 2,3 \}$ y $C = \{ 3,4 \}$ son ajenos, pues $A \cap B \cap C = \varnothing$ pero no son ajenos dos a dos pues, por ejemplo, el conjunto $A \cap B$ no es vacío. Así, los conjuntos $A$, $B$ y $C$ son ajenos en el sentido de que la intersección de todos ellos es vacía, pero no son ajenos dos a dos. 

## Conjunto Potencia

El conjunto potencia de $\Omega$, denotado por $2^\Omega$, es aquel conjunto constituido por todos los subconjuntos posibles de $\Omega$. 

Por ejemplo, si $\Omega = \{ a,b,c \}$, entonces tenemos que:
$$
2^\Omega = \{ \varnothing, \{a\}, \{b\}, \{c\}, \{a,b\}, \{a,c\}, \{b,c\}, \Omega \}
$$
Además, si se cumple que $\# \Omega < \infty \Rightarrow \#(2^\Omega) = 2^{\#\Omega}$

## Producto Cartesiano
