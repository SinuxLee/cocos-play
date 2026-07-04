/**spine 外部换图 */
export class SpineControl {

    /**
     * 替换目标骨骼下对应插槽的贴图
     * @param spine 骨骼
     * @param slotName 插槽名
     * @param spf 贴图
     */
    public static ChangeSpineSlotTexture(spine: sp.Skeleton, slotName: string, spf: cc.SpriteFrame): void {
        let slot: sp.spine.Slot = spine.findSlot(slotName);
        if (slot) {
            SpineControl.updatePartialSkin(spine, spf.getTexture(), slotName);
        } else {
            console.error(`Slot ${slotName} not found in spine skeleton.`);
        }
    }
    public static updatePartialSkin(ani: sp.Skeleton, tex2d: cc.Texture2D, slotsName: string) {
        const slot: sp.spine.Slot = ani.findSlot(slotsName);
        const attachment: sp.spine.RegionAttachment = slot.getAttachment() as sp.spine.RegionAttachment;
        if (!slot || !attachment) {
            cc.error('updatePartialSkin')
            return;
        }
        // @ts-ignore
        const skeletonTexture = new sp.SkeletonTexture({});
        skeletonTexture.setRealTexture(tex2d);

        // let page = new sp.spine.TextureAtlasPage()
        // page.name = tex2d.name
        // page.uWrap = sp.spine.TextureWrap.ClampToEdge
        // page.vWrap = sp.spine.TextureWrap.ClampToEdge
        // page.texture = skeletonTexture
        // page.texture.setWraps(page.uWrap, page.vWrap)
        // page.width = tex2d.width
        // page.height = tex2d.height
        

        let region: sp.spine.TextureAtlasRegion = attachment.region as sp.spine.TextureAtlasRegion;
        // region.page = page;
  
        region.u = 0;
        region.v = 0;
        region.u2 = 1;
        region.v2 = 1;
        region.width = tex2d.width;
        region.height = tex2d.height;
        region.originalWidth = tex2d.width;
        region.originalHeight = tex2d.height;
        region.rotate = false;
        region.texture = skeletonTexture;
        

        // mark: 不需要创建新的sp.spine.TextureAtlasRegion, 直接更新元attachment 下的region即可
        // region = this.createRegion(tex2d);
        // attachment.width = region.width;
        // attachment.height = region.height;
        cc.log(attachment);

        attachment.width = tex2d.width;
        attachment.height = tex2d.height;
        attachment.region = region;
        attachment.setRegion && attachment.setRegion(region)
        attachment.updateOffset && attachment.updateOffset();

        // attachment.updateUVs && attachment.updateUVs(attachment);

        slot.setAttachment(attachment);
    }
        
}