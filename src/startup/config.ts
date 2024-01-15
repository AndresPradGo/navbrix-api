import config from 'config';

export default function() {
    if (!config.get('jwt_secret_key')) {
        throw new Error('FATAL ERROR: jwt_secret_key is not defined!');
    }
    if (!config.get('jwt_algorithm')) {
        throw new Error('FATAL ERROR: jwt_algorithm is not defined!');
    }
}