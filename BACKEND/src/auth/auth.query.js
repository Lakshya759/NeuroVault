const CREATE_USER=`
INSERT INTO users (name,email,password)
VALUES($1,$2,$3)
RETURNING id,name,email
`;
const GET_USER_BY_EMAIL=`
SELECT *
FROM users 
WHERE email=$1
`;

const GET_USER_BY_ID=`
SELECT (id,name,email) FROM users WHERE id=$1
`;

export{
    CREATE_USER,
    GET_USER_BY_EMAIL,
    GET_USER_BY_ID
}
