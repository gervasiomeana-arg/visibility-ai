// Visibility is a private operator tool. This identifier is not a credential.
// It comes from the existing verified owner, not email or editable metadata.
export const visibilityOperatorId='b4a19328-4566-4e76-96c3-bcc793346f88';
export function isVisibilityOperator(user:{id?:unknown;is_anonymous?:unknown}|null|undefined):boolean {
 return user?.id===visibilityOperatorId&&user.is_anonymous!==true;
}
export const privateAccessMessage='Visibility es de uso privado. Esta cuenta no está autorizada.';
